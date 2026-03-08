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

# Reconfigure stdout for utf-8 logs in Cloud Run
sys.stdout.reconfigure(encoding='utf-8')

# ==========================================
# 👇 API KEY 👇
# ==========================================
GEMINI_API_KEY = "AIzaSyA0SfM5SZa36ciqO0rtCcmetUy-O4A8BLM"
# ==========================================

genai.configure(api_key=GEMINI_API_KEY)

# 🔍 SELECT MODEL
valid_model = 'gemini-1.5-flash'
try:
    for m in genai.list_models():
        if 'gemini-2.5-flash' in m.name:
            valid_model = 'models/gemini-2.5-flash'
except:
    pass
print(f"🎯 MODEL: {valid_model}")
model = genai.GenerativeModel(valid_model)

app = Flask(__name__)
CORS(app)

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

@app.route('/process_exam', methods=['POST'])
def process():
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file uploaded"}), 400

    try:
        file = request.files['file']
        mode = request.form.get('mode', 'grade')
        context = request.form.get('rubric', '')

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
        else:
            # 🚨 TRUE ENOUGH PROMPT 🚨
            ai_inputs.append(f"""
You are an automated grading engine with deterministic validation logic.
You must apply consistent scoring rules. Identical inputs must always produce identical outputs.

PROVIDED CONTEXT (Answer Key or Rubric):
"{context}"

-----------------------------------
  STEP 1: CLASSIFY GRADING TYPE
-----------------------------------

Determine grading type using these strict rules:

- If context contains fixed answers, options (A/B/C/D), exact numeric solutions, or explicit correct responses → CLASSIFY as "STRICT_MATCH".
- If context contains scoring criteria, performance levels, qualitative descriptors, or point bands → CLASSIFY as "RUBRIC_BASED".
Output classification as:
"grading_type": "STRICT_MATCH" or "RUBRIC_BASED"

-----------------------------------
  STEP 2: TRANSCRIPTION VALIDATION
-----------------------------------
If handwriting is involved:
- Transcribe exactly as written.
- Do NOT autocorrect spelling unless meaning is 100% certain.
- If a word is ambiguous, mark it using: [unclear: best_guess]

Legibility Rules:
- If all words are readable and unambiguous → legibility = "CLEAR"
- If minor ambiguity but meaning recoverable → legibility = "MOSTLY_CLEAR"
- If multiple uncertain words affect meaning → legibility = "UNCLEAR"
-----------------------------------
  STEP 3: TRUE-ENOUGH VERIFICATION
-----------------------------------
STRICT_MATCH rules:
- Exact match required unless meaning is unquestionably identical.
- Ignore capitalization and minor punctuation.
- If answer format differs but meaning is identical → count as correct.
- If ambiguity affects correctness → mark as incorrect.

 RUBRIC_BASED rules:
- Essay scoring MUST be based strictly and exclusively on the scoring criteria explicitly defined in the PROVIDED CONTEXT.
- If criteria are listed, score only according to those criteria.
- If point bands or performance levels are defined in the context, select the band that best matches the response based only on stated descriptors.
- Do NOT use external standards, general writing quality assumptions, or unstated expectations.
- Do NOT infer missing criteria.
- Provide a point allocation breakdown aligned directly with the criteria found in the context.
- Only award points for explicitly demonstrated criteria.

-----------------------------------
 STEP 4: CONFIDENCE SCORING (DETERMINISTIC)
-----------------------------------
Start at 100.

Deduct:
- 20 points if legibility = MOSTLY_CLEAR
- 40 points if legibility = UNCLEAR
- 15 points if any [unclear: guess] appears
- 10 points if response partially matches but interpretation required
- 25 points if multiple ambiguities affect grading

Minimum confidence = 0
Maximum confidence = 100
-----------------------------------
OUTPUT FORMAT (STRICT JSON ONLY)
-----------------------------------
{{
  "grading_type": "...",
  "transcribed_text": "...",
  "legibility": "...",
  "true_enough_reasoning": "Explain precisely why the grading decision is valid based only on rules above.",
  "confidence_score": <0-100>,
  "score": <final_numeric_score>,
  "feedback": "Objective feedback based only on rubric or answer key. No emotional language."
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

        # CALL GEMINI
        response = model.generate_content(
            ai_inputs,
            safety_settings={
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
            }
        )

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
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":
    # Cloud Run assigns a dynamic port
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
