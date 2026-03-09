import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
from pdf2image import convert_from_bytes
import os
import json
import io
import cv2
import numpy as np
import time
import shutil
import sys
import google.api_core.exceptions
from dotenv import load_dotenv
load_dotenv()

# Reconfigure stdout for utf-8 logs in Cloud Run
sys.stdout.reconfigure(encoding='utf-8')

# ==========================================
# 👇 API KEY 👇
# ==========================================
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError('GEMINI_API_KEY not set in environmental products of my heart')
# ==========================================
genai.configure(api_key=GEMINI_API_KEY)

# 🔍 SELECT MODEL
valid_model = 'gemini-2.5-flash'
print(f"🎯 MODEL: {valid_model}")
model = genai.GenerativeModel(valid_model)

app = Flask(__name__)
CORS(app)

@app.route('/ping', methods=['GET'])
def ping():
    print("🏓 PING received!")
    return jsonify({"status": "ok"}), 200

# 📂 SETUP OUTPUT FOLDERS
OUTPUT_DIR = "processed_images"
CROP_DIR = "processed_images/crops"
TRANSCRIPT_DIR = "processed_images/transcripts"

# Clean/Create Folders
if os.path.exists(CROP_DIR): shutil.rmtree(CROP_DIR)
for d in [OUTPUT_DIR, CROP_DIR, TRANSCRIPT_DIR]:
    if not os.path.exists(d): os.makedirs(d)

def clean_json_text(text):
    return text.replace("```json", "").replace("```", "").strip()

# 🔹 OPENCV PIPELINE
def enhance_image(pil_img, page_num):
    try:
        img = np.array(pil_img)
        if len(img.shape) == 3: img = img[:, :, ::-1].copy()

        # 1. Denoise & Sharpen
        denoised = cv2.fastNlMeansDenoisingColored(img, None, 10, 10, 7, 21)
        kernel = np.array([[0, -1, 0], [-1, 5,-1], [0, -1, 0]])
        sharpened = cv2.filter2D(denoised, -1, kernel)

        # 2. Text Detection & Cropping (For Visual Debugging)
        gray = cv2.cvtColor(sharpened, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        dilated = cv2.dilate(thresh, cv2.getStructuringElement(cv2.MORPH_RECT, (15, 3)), iterations=1)
        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        vis_img = sharpened.copy()
        for i, cnt in enumerate(contours):
            x, y, w, h = cv2.boundingRect(cnt)
            if w > 50 and h > 20:
                cv2.rectangle(vis_img, (x, y), (x+w, y+h), (0, 255, 0), 2)
                roi = sharpened[y:y+h, x:x+w]
                cv2.imwrite(f"{CROP_DIR}/p{page_num}_text_{i}.jpg", roi)

        timestamp = int(time.time())
        cv2.imwrite(f"{OUTPUT_DIR}/p{page_num}_{timestamp}_final.jpg", vis_img)

        return Image.fromarray(cv2.cvtColor(sharpened, cv2.COLOR_BGR2RGB))
    except Exception as e:
        print(f"⚠️ OpenCV Error: {e}")
        return pil_img
    
@app.route('/debug_form', methods=['POST'])
def debug_form():
    """Temporary debug endpoint - remove after testing"""
    return jsonify({
        "form_keys": list(request.form.keys()),
        "form_data": {k: v[:100] for k, v in request.form.items()},
        "files": list(request.files.keys())
    })

@app.route('/process_exam', methods=['POST'])
def process():
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file uploaded"}), 400

    try:
        file = request.files['file']
        mode = request.form.get('mode', 'grade')
        context = (
            request.form.get('rubric') or
            request.form.get('context') or
            request.form.get('answer_key') or
            request.form.get('criteria') or
            ''
        ).strip()

        # Add this debug log so you can see in Cloud Run logs what's arriving
        print(f"📋 Context received ({len(context)} chars): {context[:300] if context else '⚠️ EMPTY!'}")
        # READ FILE
        file_bytes = file.read()
        raw_images = []
        try:
            raw_images = convert_from_bytes(file_bytes)
            print(f"📄 PDF Detected: {len(raw_images)} pages")
        except:
            try:
                img = Image.open(io.BytesIO(file_bytes))
                print(f"🖼️ Image Detected: {img.mode}")
                raw_images = [img]
            except:
                 return jsonify({"success": False, "error": "Invalid File"}), 400

        ai_inputs = []

        if mode == 'masterlist':
            ai_inputs.append("""
            Extract student data as JSON.
            Format: [{"name": "FullName", "id": "StudentID_or_null"}]
            """)
        if context:
            context_block = f"""
        === ANSWER KEY / RUBRIC (READ THIS FIRST) ===
        {context}
        ==============================================
        """
        else:
            context_block = "=== NO RUBRIC PROVIDED — Score everything as 0 and explain why ==="

        ai_inputs.append(f"""
        You are a strict grading engine. Read the answer key or rubric below carefully before grading.

        {context_block}

        GRADING INSTRUCTIONS:

        1. MULTIPLE CHOICE / TRUE-FALSE:
        - Compare each student answer to the answer key EXACTLY.
        - Each correct answer = 1 point. Each wrong or blank answer = 0 points.
        - Score = total number of correct answers.
        - Do NOT assign partial points. Do NOT weight any question higher than others.
        - Example: 20 questions, 15 correct → score = 15, NOT 75 or 37.5.

        2. ESSAY/OPEN-ENDED:
        - Score ONLY using criteria explicitly listed in the rubric.
        - Do not use external standards or unstated expectations.
        - Award 0 for criteria not demonstrated.

        3. HANDWRITING:
        - Transcribe exactly as written.
        - Mark unclear words as [unclear: best_guess].

        4. CONFIDENCE:
        - Start at 100
        - Deduct 20 if handwriting is mostly unclear
        - Deduct 40 if handwriting is very unclear
        - Deduct 15 per [unclear] word
        - Minimum: 0

        CRITICAL RULES:
        - score = raw count of correct answers for MCQ/TF (never multiply by any point value)
        - score = rubric points earned for essays
        - Never invent a scoring scale not defined in the rubric
        - Identical answers must always produce identical scores

        OUTPUT — return ONLY this JSON, no extra text:
        {{
        "grading_type": "STRICT_MATCH or RUBRIC_BASED",
        "transcribed_text": "full transcription of student answers",
        "legibility": "CLEAR / MOSTLY_CLEAR / UNCLEAR",
        "true_enough_reasoning": "explain your grading decisions item by item",
        "confidence_score": <0-100>,
        "score": <numeric score>,
        "feedback": "brief objective feedback per question"
        }}
        """)

        # PROCESS IMAGES
        print("⚙️  Running OpenCV Pipeline...")
        for i, img in enumerate(raw_images):
            img = enhance_image(img, i+1)
            buf = io.BytesIO()
            img.save(buf, format='JPEG', quality=90)
            ai_inputs.append({ "mime_type": "image/jpeg", "data": buf.getvalue() })

        print(f"outbox: Sending {len(raw_images)} images to Gemini...")

           # ✅ Download and process answer key from URL
        answer_key_url = request.form.get('answer_key_url')
        if answer_key_url:
            try:
                import requests as req
                key_response = req.get(answer_key_url, timeout=15)
                key_bytes = key_response.content
                key_name = answer_key_url.split('%2F')[-1].split('?')[0].lower()

                print(f"📎 File type detected: {key_name}")

                if key_name.endswith('.docx') or key_name.endswith('.doc'):
                    try:
                        import subprocess, tempfile, os
                        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as f:
                            f.write(key_bytes)
                            tmp_path = f.name
                        subprocess.run(
                            ['libreoffice', '--headless', '--convert-to', 'pdf', '--outdir', '/tmp', tmp_path],
                            capture_output=True, timeout=30
                        )
                        pdf_path = tmp_path.replace('.docx', '.pdf')
                        if os.path.exists(pdf_path):
                            with open(pdf_path, 'rb') as f:
                                key_bytes = f.read()
                            key_images = convert_from_bytes(key_bytes)
                        else:
                            raise Exception("PDF not created")
                    except Exception as lo_err:
                        print(f"⚠️ LibreOffice failed: {lo_err}, falling back to text extraction")
                        from docx import Document as DocxDocument
                        import io as _io
                        doc = DocxDocument(_io.BytesIO(key_bytes))
                        extracted_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
                        print(f"📄 Extracted docx text ({len(extracted_text)} chars)")
                        ai_inputs[0] = ai_inputs[0] + f"\n\nANSWER KEY CONTENT:\n{extracted_text}"
                        key_images = []

                elif key_name.endswith('.pdf'):
                    key_images = convert_from_bytes(key_bytes)
                else:
                    key_images = []

                if key_images:
                    print(f"📎 Answer key: {len(key_images)} pages")
                    ai_inputs.append("The following pages are the ANSWER KEY. Use them to grade the exam:")
                    for i, img in enumerate(key_images):
                        img = enhance_image(img, f"key_{i+1}")
                        buf = io.BytesIO()
                        img.save(buf, format='JPEG', quality=90)
                        ai_inputs.append({"mime_type": "image/jpeg", "data": buf.getvalue()})

            except Exception as e:
                print(f"⚠️ Could not process answer key URL: {e}")

        print(f"outbox: Sending {len(raw_images)} images to Gemini...")
        # CALL GEMINI
        try:
            response = model.generate_content(
                ai_inputs,
                generation_config=genai.GenerationConfig(
                    temperature=0,   
                    top_p=1,
                    top_k=1,
                ),
                safety_settings={
                    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
                }
            )
        except google.api_core.exceptions.ResourceExhausted as e:
            print(f"⚠️ Quota Exceeded: {e}")
            return jsonify({
                "success": False,
                "error": "quota_exceeded",
                "message": "AI service is temporarily unavailable. Please try again in a minute."
            }), 429

        print("✅ Response Received!")
        if not response.parts:
            return jsonify({"success": False, "error": "AI Safety Block"}), 500

        raw_text = response.text
        start = raw_text.find('{')
        end = raw_text.rfind('}') + 1

        if start != -1:
            clean_json = raw_text[start:end]
            data = json.loads(clean_json)

            # 🔥 SAVE TRANSCRIPT + TRUE ENOUGH LOG 🔥
            try:
                extracted_text = data.get("transcribed_text", "No text found")
                reasoning = data.get("true_enough_reasoning", "No verification log")
                confidence = data.get("confidence_score", "N/A")

                timestamp = int(time.time())
                filename = f"{TRANSCRIPT_DIR}/exam_{timestamp}_verification.txt"

                with open(filename, "w", encoding="utf-8") as f:
                    f.write(f"--- TRUE ENOUGH VERIFICATION REPORT ({timestamp}) ---\n")
                    f.write(f"CONFIDENCE SCORE: {confidence}%\n")
                    f.write(f"VERIFICATION LOG: {reasoning}\n")
                    f.write("-" * 30 + "\n")
                    f.write("TRANSCRIPTION:\n")
                    f.write(extracted_text)

                print(f"💾 Saved verification report to: {filename}")

            except Exception as e:
                print(f"⚠️ Could not save text file: {e}")

            return jsonify({"success": True, "data": data})
        else:
            print(f"❌ Bad Output: {raw_text}")
            return jsonify({"success": False, "error": "AI returned invalid JSON"}), 500

    except Exception as e:
        print(f"❌ Error: {e}")
        # ✅ Never expose raw error to frontend
        return jsonify({
            "success": False,
            "error": "server_error",
            "message": "Something went wrong. Please try again."
        }), 500

if __name__ == "__main__":
    # Cloud Run assigns a dynamic port
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
