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
# API KEY
# ==========================================
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError('GEMINI_API_KEY not set in environment variables')

genai.configure(api_key=GEMINI_API_KEY)

# SELECT MODEL
valid_model = 'gemini-2.5-flash'
print(f"🎯 MODEL: {valid_model}")
model = genai.GenerativeModel(valid_model)

app = Flask(__name__)
CORS(app)

# ==========================================
# OUTPUT FOLDERS
# ==========================================
OUTPUT_DIR = "processed_images"
CROP_DIR = "processed_images/crops"
TRANSCRIPT_DIR = "processed_images/transcripts"

if os.path.exists(CROP_DIR):
    shutil.rmtree(CROP_DIR)
for d in [OUTPUT_DIR, CROP_DIR, TRANSCRIPT_DIR]:
    if not os.path.exists(d):
        os.makedirs(d)

# ==========================================
# SAFETY SETTINGS (reusable)
# ==========================================
SAFETY_SETTINGS = {
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
}

GENERATION_CONFIG = genai.GenerationConfig(
    temperature=0,
    top_p=1,
    top_k=1,
)

# ==========================================
# HELPERS
# ==========================================
def enhance_image(pil_img, page_num):
    """Denoise and sharpen a PIL image using OpenCV."""
    try:
        img = np.array(pil_img)
        if len(img.shape) == 3:
            img = img[:, :, ::-1].copy()

        denoised = cv2.fastNlMeansDenoisingColored(img, None, 10, 10, 7, 21)
        kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
        sharpened = cv2.filter2D(denoised, -1, kernel)

        gray = cv2.cvtColor(sharpened, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        dilated = cv2.dilate(thresh, cv2.getStructuringElement(cv2.MORPH_RECT, (15, 3)), iterations=1)
        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        vis_img = sharpened.copy()
        for i, cnt in enumerate(contours):
            x, y, w, h = cv2.boundingRect(cnt)
            if w > 50 and h > 20:
                cv2.rectangle(vis_img, (x, y), (x + w, y + h), (0, 255, 0), 2)
                roi = sharpened[y:y + h, x:x + w]
                cv2.imwrite(f"{CROP_DIR}/p{page_num}_text_{i}.jpg", roi)

        timestamp = int(time.time())
        cv2.imwrite(f"{OUTPUT_DIR}/p{page_num}_{timestamp}_final.jpg", vis_img)

        return Image.fromarray(cv2.cvtColor(sharpened, cv2.COLOR_BGR2RGB))
    except Exception as e:
        print(f"⚠️ OpenCV Error: {e}")
        return pil_img


def read_file_as_images(file_bytes, label="exam"):
    """Convert uploaded file bytes to list of enhanced PIL images."""
    raw_images = []
    try:
        raw_images = convert_from_bytes(file_bytes)
        print(f"📄 PDF Detected ({label}): {len(raw_images)} pages")
    except Exception:
        try:
            img = Image.open(io.BytesIO(file_bytes))
            print(f"🖼️ Image Detected ({label}): {img.mode}")
            raw_images = [img]
        except Exception:
            raise ValueError(f"Invalid file format for {label}. Supported: PDF, JPG, PNG.")

    enhanced = []
    for i, img in enumerate(raw_images):
        enhanced.append(enhance_image(img, f"{label}_{i+1}"))
    return enhanced


def extract_docx_text(file_bytes):
    """Extract all text from a DOCX file including tables. Pure Python, no LibreOffice."""
    from docx import Document as DocxDocument
    doc = DocxDocument(io.BytesIO(file_bytes))

    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]

    table_texts = []
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                cell_text = "\n".join(p.text.strip() for p in cell.paragraphs if p.text.strip())
                if cell_text:
                    table_texts.append(cell_text)

    return "\n".join(paragraphs + table_texts)


def fetch_and_parse_url(url):
    """
    Download a file from URL and return (images, text).
    Supports: PDF → images, DOCX → text
    """
    import requests as req
    from urllib.parse import urlparse, unquote

    response = req.get(url, timeout=15)
    file_bytes = response.content
    key_name = unquote(os.path.basename(urlparse(url).path)).lower()
    print(f"📎 Processing URL file: {key_name}")

    if key_name.endswith('.docx') or key_name.endswith('.doc'):
        try:
            text = extract_docx_text(file_bytes)
            print(f"📄 DOCX extracted: {len(text)} chars")
            return [], text
        except Exception as e:
            print(f"⚠️ DOCX extraction failed: {e}")
            return [], ""

    if key_name.endswith('.pdf'):
        try:
            images = read_file_as_images(file_bytes, label="key")
            print(f"📄 PDF key: {len(images)} pages")
            return images, ""
        except Exception as e:
            print(f"⚠️ PDF key failed: {e}")
            return [], ""

    print(f"⚠️ Unsupported URL file format: {key_name}")
    return [], ""


def call_gemini(ai_inputs):
    """Call Gemini with the given inputs and return parsed JSON data."""
    response = model.generate_content(
        ai_inputs,
        generation_config=GENERATION_CONFIG,
        safety_settings=SAFETY_SETTINGS,
    )

    if not response.parts:
        raise ValueError("AI Safety Block — no response parts returned.")

    raw_text = response.text
    start = raw_text.find('{')
    end = raw_text.rfind('}') + 1

    if start == -1:
        raise ValueError(f"AI returned invalid JSON: {raw_text[:200]}")

    return json.loads(raw_text[start:end])


def save_transcript_log(data):
    """Save a transcript verification report to disk."""
    try:
        timestamp = int(time.time())
        filename = f"{TRANSCRIPT_DIR}/exam_{timestamp}_verification.txt"
        with open(filename, "w", encoding="utf-8") as f:
            f.write(f"--- VERIFICATION REPORT ({timestamp}) ---\n")
            f.write(f"CONFIDENCE SCORE: {data.get('confidence_score', 'N/A')}%\n")
            f.write("-" * 30 + "\n")
            f.write("TRANSCRIPTION:\n")
            f.write(data.get("transcribed_text", ""))
        print(f"💾 Saved: {filename}")
    except Exception as e:
        print(f"⚠️ Could not save transcript: {e}")


# ==========================================
# ROUTES
# ==========================================

@app.route('/ping', methods=['GET'])
def ping():
    print("🏓 PING received!")
    return jsonify({"status": "ok"}), 200


@app.route('/transcribe', methods=['POST'])
def transcribe():
    """
    Step 1: Transcribe handwritten exam image to text only.
    No grading is performed here.
    """
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file uploaded"}), 400

    try:
        file = request.files['file']
        file_bytes = file.read()

        images = read_file_as_images(file_bytes, label="exam")

        ai_inputs = ["""
You are a transcription engine only.
Your ONLY job is to transcribe handwritten text exactly as written.

RULES:
- Transcribe every word exactly as written.
- Preserve all spelling errors, grammar mistakes, and punctuation.
- Do NOT correct anything.
- Do NOT grade or evaluate anything.
- Mark unclear words as [unclear: best_guess]
- Mark fully unreadable lines as [unclear]
- Preserve question numbers exactly as written (e.g. 46. 47. 48.)
- Transcribe ALL numbered questions present in the image.

CONFIDENCE RULES:
- Start at 100
- Deduct 20 if handwriting is mostly unclear
- Deduct 40 if handwriting is very unclear
- Deduct 15 per [unclear] or [unclear: best_guess] token
- Minimum: 0

Return ONLY this JSON, no extra text:
{
  "transcribed_text": "full transcription preserving all question numbers and answers",
  "legibility": "CLEAR / MOSTLY_CLEAR / UNCLEAR",
  "confidence_score": <0-100>
}
"""]

        print(f"⚙️ Transcribing {len(images)} image(s)...")
        for img in images:
            buf = io.BytesIO()
            img.save(buf, format='JPEG', quality=90)
            ai_inputs.append({"mime_type": "image/jpeg", "data": buf.getvalue()})

        data = call_gemini(ai_inputs)
        print(f"✅ Transcription done: {len(data.get('transcribed_text', ''))} chars")
        save_transcript_log(data)

        return jsonify({"success": True, "data": data})

    except google.api_core.exceptions.ResourceExhausted as e:
        print(f"⚠️ Quota Exceeded: {e}")
        return jsonify({
            "success": False,
            "error": "quota_exceeded",
            "message": "AI service is temporarily unavailable. Please try again in a minute."
        }), 429
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        print(f"❌ Transcription Error: {e}")
        return jsonify({"success": False, "error": "server_error", "message": "Something went wrong."}), 500


@app.route('/grade', methods=['POST'])
def grade():
    """
    Step 2: Grade a transcribed text using the provided rubric/answer key.
    Accepts JSON body with transcribed_text, context, and optional answer_key_text.
    Also accepts optional answer_key_url and reference_url for file-based rubrics.
    """
    try:
        body = request.get_json()
        transcribed_text = body.get('transcribed_text', '').strip()
        context = body.get('context', '').strip()
        answer_key_text = body.get('answer_key_text', '').strip()
        answer_key_url = body.get('answer_key_url', '')
        reference_url = body.get('reference_url', '')

        if not transcribed_text:
            return jsonify({"success": False, "error": "No transcription provided"}), 400

        print(f"📋 Grading transcription ({len(transcribed_text)} chars)...")

        # BUILD CONTEXT BLOCK
        if context:
            context_block = f"=== ANSWER KEY / RUBRIC ===\n{context}\n=========================="
        else:
            context_block = "=== NO RUBRIC PROVIDED — Score everything as 0 ==="

        if answer_key_text:
            context_block += f"\n\nANSWER KEY CONTENT:\n{answer_key_text}"

        # FETCH ADDITIONAL RUBRIC/REFERENCE FILES FROM URLS
        extra_images = []
        for url in [answer_key_url, reference_url]:
            if not url:
                continue
            try:
                imgs, text = fetch_and_parse_url(url)
                if text:
                    context_block += f"\n\nADDITIONAL REFERENCE:\n{text}"
                if imgs:
                    extra_images.extend(imgs)
            except Exception as e:
                print(f"⚠️ Could not fetch URL {url}: {e}")

        prompt = f"""
You are a deterministic exam grading engine.

{context_block}

=== STUDENT TRANSCRIPTION ===
{transcribed_text}
=============================

Grade the student transcription above using ONLY the rubric and answer key provided.
Do NOT re-read any image. Grade only from the transcription text above.

GENERAL RULES:
- Grade only from the provided materials.
- Never invent rubric criteria, point values, or answer keys.
- IDENTICAL TRANSCRIPTION + RUBRIC MUST ALWAYS PRODUCE IDENTICAL SCORES.
- Never exceed the rubric maximum score.

OBJECTIVE SCORING RULES (MCQ / TRUE-FALSE):
- Compare each student answer to the answer key exactly.
- Correct = 1 point. Wrong or blank = 0 points.
- No partial credit. No weighting.
- Raw score = total correct answers only.

ESSAY SCORING RULES:
- Each numbered question is graded separately.
- Score essays only using explicit rubric requirements that are written in the rubric.
- Do not invent subcriteria, hidden standards, or writing-quality rules unless the rubric explicitly includes them.
- For each question, identify the rubric requirements as a checklist of required content.
- Count how many explicit rubric requirements are clearly present in the student transcription.
- Assign the score by content coverage only, not by writing style.

DETERMINISTIC ESSAY SCORE MAPPING:
Let:
- R = number of explicit rubric requirements for the question
- P = number of those requirements clearly present in the student answer

Then assign the final score using ONLY this mapping:
- If answer is blank or off-topic: score = 0
- If P = R: score = rubric max
- Otherwise score = floor((P / R) * rubric max)

RULES FOR COUNTING REQUIREMENTS:
- Count a requirement as present only if it is explicitly supported by visible text in the transcription.
- Do not infer intended meaning.
- If a requirement is only partially present, count it as not present.
- If unsure whether a requirement is present, count it as not present.
- All requirements are equally weighted unless the rubric explicitly gives different weights.
- If the rubric explicitly gives point values per criterion, use those exact points instead of the proportional formula above.

JUSTIFICATION:
- Give 1-2 short sentences only.
- Mention which required content was present and which was missing.
- Do not mention hidden reasoning.

ESSAY SCORE LOG FORMAT (repeat for EACH numbered question):
ESSAY SCORE LOG
Question: [number]
Rubric Max Score: [max from rubric]
Final Score: [earned] / [max]
Reason: [1-2 sentences based only on visible content]

FINAL TOTAL SCORE: [sum of all question Final Scores]

FAIL-SAFE RULES:
- If rubric is missing, score essay items as 0 and explain why.
- If answer is blank, score = 0.
- Never fabricate missing information.

Return ONLY this JSON, no extra text:
{{
  "grading_type": "STRICT_MATCH or RUBRIC_BASED",
  "legibility": "CLEAR / MOSTLY_CLEAR / UNCLEAR",
  "essay_score_log": "MUST be a plain text string only. No JSON objects, no arrays, no nested keys. Use \\n for line breaks. Format: \\nQuestion: 46\\nFinal Score: 3 / 5\\nReason: ..."
  "confidence_score": <0-100>,
  "score": <numeric total score>,
  "feedback": "brief objective feedback per question and only on matching type, always display the answer and right answer"
}}
"""

        ai_inputs = [prompt]

        # Append any reference images (PDF rubrics/references)
        if extra_images:
            ai_inputs.append("The following pages are reference/rubric material:")
            for img in extra_images:
                buf = io.BytesIO()
                img.save(buf, format='JPEG', quality=90)
                ai_inputs.append({"mime_type": "image/jpeg", "data": buf.getvalue()})

        data = call_gemini(ai_inputs)
        print(f"✅ Grading done: score={data.get('score')}")

        return jsonify({"success": True, "data": data})

    except google.api_core.exceptions.ResourceExhausted as e:
        print(f"⚠️ Quota Exceeded: {e}")
        return jsonify({
            "success": False,
            "error": "quota_exceeded",
            "message": "AI service is temporarily unavailable. Please try again in a minute."
        }), 429
    except Exception as e:
        print(f"❌ Grading Error: {e}")
        return jsonify({"success": False, "error": "server_error", "message": "Something went wrong."}), 500


@app.route('/masterlist', methods=['POST'])
def masterlist():
    """Extract student names and IDs from an uploaded image or PDF."""
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file uploaded"}), 400

    try:
        file = request.files['file']
        file_bytes = file.read()
        images = read_file_as_images(file_bytes, label="masterlist")

        ai_inputs = ["""
Extract student data from this image as JSON.
Return ONLY a JSON array, no extra text:
[{"name": "FullName", "id": "StudentID_or_null"}]
"""]

        for img in images:
            buf = io.BytesIO()
            img.save(buf, format='JPEG', quality=90)
            ai_inputs.append({"mime_type": "image/jpeg", "data": buf.getvalue()})

        response = model.generate_content(
            ai_inputs,
            generation_config=GENERATION_CONFIG,
            safety_settings=SAFETY_SETTINGS,
        )

        raw_text = response.text
        start = raw_text.find('[')
        end = raw_text.rfind(']') + 1

        if start != -1:
            data = json.loads(raw_text[start:end])
            return jsonify({"success": True, "data": data})
        else:
            return jsonify({"success": False, "error": "Could not parse masterlist"}), 500

    except google.api_core.exceptions.ResourceExhausted as e:
        print(f"⚠️ Quota Exceeded: {e}")
        return jsonify({
            "success": False,
            "error": "quota_exceeded",
            "message": "AI service is temporarily unavailable. Please try again in a minute."
        }), 429
    except Exception as e:
        print(f"❌ Masterlist Error: {e}")
        return jsonify({"success": False, "error": "server_error", "message": "Something went wrong."}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)