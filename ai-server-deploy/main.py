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
for m in genai.list_models():
    print(m.name)

# SELECT MODELS
transcription_model = genai.GenerativeModel('gemini-2.5-flash')  # vision + speed
grading_model = genai.GenerativeModel('gemini-2.5-flash-lite')        # consistency
print(f"🎯 TRANSCRIPTION MODEL:", transcription_model.model_name)
print(f"🎯 GRADING MODEL:", grading_model.model_name)

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
    import requests as req
    from urllib.parse import urlparse, unquote

    response = req.get(url, timeout=15)

    # Guard: bad HTTP status
    if response.status_code != 200:
        print(f"⚠️ URL returned HTTP {response.status_code}: {url[:80]}")
        return [], ""

    file_bytes = response.content
    content_type = response.headers.get("Content-Type", "")
    key_name = unquote(os.path.basename(urlparse(url).path)).lower()
    print(f"📎 Processing URL file: {key_name} | {content_type} | {len(file_bytes)} bytes")

    # Guard: got HTML instead of a file (auth redirect / 403 page)
    if "text/html" in content_type or file_bytes[:5] in (b"<!DOC", b"<html"):
        print(f"⚠️ URL returned HTML — likely an unauthenticated storage path")
        return [], ""

    if key_name.endswith('.docx') or key_name.endswith('.doc'):
        if file_bytes[:4] != b'PK\x03\x04':  # DOCX magic (ZIP)
            print(f"⚠️ Not a valid DOCX (got: {file_bytes[:8]})")
            return [], ""
        try:
            text = extract_docx_text(file_bytes)
            print(f"📄 DOCX extracted: {len(text)} chars")
            return [], text
        except Exception as e:
            print(f"⚠️ DOCX extraction failed: {e}")
            return [], ""

    if key_name.endswith('.pdf'):
        if file_bytes[:4] != b'%PDF':  # PDF magic
            print(f"⚠️ Not a valid PDF (got: {file_bytes[:8]})")
            return [], ""
        try:
            images = read_file_as_images(file_bytes, label="key")
            print(f"📄 PDF key: {len(images)} pages")
            return images, ""
        except Exception as e:
            print(f"⚠️ PDF key failed: {e}")
            return [], ""

    print(f"⚠️ Unsupported URL file format: {key_name}")
    return [], ""


def call_gemini(ai_inputs, model):
    response = model.generate_content(
        ai_inputs,
        generation_config=GENERATION_CONFIG,
        safety_settings=SAFETY_SETTINGS,
    )

    # Check finish reason before accessing .text
    if not response.candidates:
        raise ValueError("AI Safety Block — no candidates returned.")

    candidate = response.candidates[0]
    finish_reason = candidate.finish_reason

    # finish_reason 3 = SAFETY, 4 = RECITATION, 1 = STOP (ok)
    if finish_reason == 3:
        blocked = [
            f"{r.category.name}: {r.probability.name}"
            for r in candidate.safety_ratings
            if r.probability.name not in ("NEGLIGIBLE", "LOW")
        ]
        raise ValueError(f"Safety block. Ratings: {blocked}")

    if not response.parts:
        raise ValueError(f"No response parts. Finish reason: {finish_reason}")

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
    files = request.files.getlist('file')

    if not files or all(file.filename == '' for file in files):
        return jsonify({"success": False, "error": "No file uploaded"}), 400

    try:
        # 👇 Loop through ALL files instead of just request.files['file']
        all_images = []
        for file in files:
            file_bytes = file.read()
            print(f"📄 File received: {file.filename}, size: {len(file_bytes)} bytes", flush=True)
            images = read_file_as_images(file_bytes, label=file.filename or "exam")
            all_images.extend(images)

        print(f"⚙️ Transcribing {len(all_images)} image(s) from {len(files)} file(s)...", flush=True)

        ai_inputs = ["""
                    You are a document digitization tool.
                    Your only task is to read and copy handwritten text from the provided image(s) exactly as written.

                    RULES:
                    - Transcribe every word exactly as written.
                    - Preserve all spelling errors, grammar mistakes, and punctuation.
                    - Do NOT correct anything.
                    - Do NOT grade or evaluate anything.
                    - Mark unclear words as [unclear: best_guess]
                    - Mark fully unreadable lines as [unclear]
                    - Preserve question numbers exactly as written (e.g. 46. 47. 48.)
                    - Transcribe ALL numbered questions present in the image.
                    - If multiple pages are provided, transcribe ALL pages in order.

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

        # 👇 Add ALL images to the AI input
        for img in all_images:
            buf = io.BytesIO()
            img.save(buf, format='JPEG', quality=90)
            ai_inputs.append({"mime_type": "image/jpeg", "data": buf.getvalue()})

        data = call_gemini(ai_inputs, transcription_model)
        print(f"✅ Transcription done: {len(data.get('transcribed_text', ''))} chars", flush=True)
        save_transcript_log(data)

        return jsonify({"success": True, "data": data})

    except google.api_core.exceptions.ResourceExhausted as e:
        print(f"⚠️ Quota Exceeded: {e}", flush=True)
        return jsonify({
            "success": False,
            "error": "quota_exceeded",
            "message": "AI service is temporarily unavailable. Please try again in a minute."
        }), 429
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        print(f"❌ Transcription Error: {e}", flush=True)
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

         # ✅ Initialize ALL variables at the top before any logic
        context_block = ""
        extra_images = []

        if not transcribed_text:
            return jsonify({"success": False, "error": "No transcription provided"}), 400
        
        print(f"📋 context length: {len(context)} chars")
        print(f"📋 answer_key_text length: {len(answer_key_text)} chars")
        print(f"📋 answer_key_url: {answer_key_url[:80] if answer_key_url else 'none'}")
        print(f"📋 context_block preview:\n{context_block[:500]}")

        print(f"📋 Grading transcription ({len(transcribed_text)} chars)...")

        # BUILD CONTEXT BLOCK

        if context:
            context_block += f"=== ANSWER KEY (MCQ/TF) ===\n{context}\n===========================\n\n"

        if answer_key_text:
            context_block += f"=== ESSAY RUBRIC ===\n{answer_key_text}\n===================\n\n"

        # FETCH ADDITIONAL RUBRIC/REFERENCE FILES FROM URLS
        for url, label in [(answer_key_url, "RUBRIC FROM FILE"), (reference_url, "REFERENCE MATERIAL")]:
            if not url:
                continue
            try:
                imgs, text = fetch_and_parse_url(url)
                if text:
                    context_block += f"=== {label} ===\n{text}\n{'=' * (len(label) + 8)}\n\n"
                    print(f"📋 {label}: {len(text)} chars appended to context")
                if imgs:
                    extra_images.extend(imgs)
            except Exception as e:
                print(f"⚠️ Could not fetch URL {url}: {e}")

        if not context_block.strip():
            context_block = "=== NO RUBRIC PROVIDED — Score everything as 0 ==="

        print(f"📋 Final context_block ({len(context_block)} chars):\n{context_block[:600]}")

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
        - Never exceed the rubric maximum score.
        - If unsure, always choose the LOWER score.

       OBJECTIVE SCORING RULES (MCQ / TRUE-FALSE / MATCHING):
        - Compare each student answer to the answer key exactly.
        - Correct = 1 point. Wrong or blank = 0 points.
        - No partial credit. No weighting.
        - Raw score = total correct answers only.

        MATCHING TYPE RULES:
        - Each correctly matched pair = 1 point.
        - Treat each numbered item in the matching section as a separate answer.
        - Compare the student's chosen match to the answer key for that item.
        - If the student writes the wrong letter/word or leaves it blank = 0 points.
        - Do NOT give partial credit for "close" matches.
        - Count ALL matching items present in the answer key.

        QUESTION TYPE DETECTION:
        - Look at the section headers or question instructions to identify question type.
        - Keywords like "Match", "Column A", "Column B" = MATCHING TYPE → use matching rules.
        - Keywords like "Choose", "Circle", "True or False" = MCQ/TF → use objective rules.
        - Keywords like "Explain", "Discuss", "Describe" = ESSAY → use essay rules.
        - If no clear header, infer from answer format (single letter = MCQ, paired answers = matching).

        OBJECTIVE SCORE LOG FORMAT (one entry per question, no repeated headers):
        Question: [number]
        Student Answer: [answer]
        Correct Answer: [answer]
        Points: [1 or 0]
        ---
        (repeat for each objective question)

        TOTAL OBJECTIVE SCORE: [sum of points from all objective questions]

        ESSAY SCORING RULES:
        STEP 1 — LIST RUBRIC REQUIREMENTS:
        Before grading, extract the explicit rubric requirements as a numbered list.
        Only include requirements that are literally written in the rubric.
        Do not add, infer, or interpret any requirement not explicitly stated.

        STEP 2 — CHECK EACH REQUIREMENT:
        For each requirement, find a DIRECT QUOTE from the student transcription that satisfies it.
        - PRESENT = you can copy-paste a specific phrase from the transcription that directly satisfies the requirement.
        - ABSENT = you cannot find a specific phrase. Vague or implied content = ABSENT.
        - When in doubt = ABSENT.

        STEP 3 — COUNT AND SCORE:
        - R = total number of rubric requirements
        - P = number of requirements with a direct quote found
        - raw_score = floor((P / R) * rubric_max)
        - minimum_score = lowest score value defined in the rubric (e.g. if rubric scale is 2-5, minimum = 2)
        - Final Score = max(raw_score, minimum_score) UNLESS answer is blank or off-topic
        - If blank or completely off-topic: score = 0 (minimum does not apply)
        - If rubric has explicit point values per criterion, use those instead.

        MINIMUM SCORE RULE:
        - Read the rubric carefully for any stated minimum score.
        - If the rubric defines a scale (e.g. 2 to 5, or 1 to 10), the lowest value on that scale is the minimum.
        - Never assign a score below the rubric minimum unless the answer is blank or off-topic.
        - A wrong or poor answer still gets the minimum score if the student attempted to answer.
        - Before scoring make sure to double read the rubric for stated score range or minimum and maximum score.

        STEP 4 — VERIFY:
        Re-check your direct quotes. Remove any quote that is:
        - Paraphrased (not exact words from transcription)
        - Implied but not stated
        - A general reference without specifics
        Recount P after removing invalid quotes.
        Recalculate score.

        JUSTIFICATION FORMAT:
        For each question write:
        - Which requirements were PRESENT with the exact quote found
        - Which requirements were ABSENT and why no quote was found

        ESSAY SCORE LOG FORMAT (one entry per question, no repeated headers):
        Question: [number]
        Rubric Requirements: [list each requirement from rubric]
        Present ([P]/[R]):
        - [requirement] → "[exact quote from transcription]"
        Absent:
        - [requirement] → no direct quote found
        Rubric Max Score: [max]
        Final Score: floor(([P]/[R]) * [max]) = [result]
        Reason: [1-2 sentences]  
        ---
        (repeat for each essay question)

        TOTAL ESSAY SCORE: [sum of all essay question scores]

        FINAL TOTAL SCORE: [sum of ALL objective points + ALL essay Final Scores]

        FAIL-SAFE RULES:
        - If rubric is missing: score = 0, explain why.
        - If answer is blank: score = 0.
        - Never fabricate quotes or requirements.
        - Never round up. Always use floor().


        Return ONLY this JSON, no extra text:
        {{
        "grading_type": "STRICT_MATCH or RUBRIC_BASED",
        "objective_score_log": "Log for ALL objective questions (MCQ, True/False, Matching). Plain text only. Use \\n for line breaks.",
        "essay_score_log": "Log for ALL essay questions only. Plain text only. Use \\n for line breaks.",
        "confidence_score": <0-100>,
        "score": <numeric total — sum of ALL section scores: objective + essay>,
        "feedback": "brief feedback."
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

        data = call_gemini(ai_inputs, grading_model)
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

        response = transcription_model.generate_content(
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