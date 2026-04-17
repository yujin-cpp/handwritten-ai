import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
from pdf2image import convert_from_bytes
import os
import json
import io
import re
import cv2
import numpy as np
import time
import shutil
import sys
import google.api_core.exceptions
from difflib import SequenceMatcher
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

# In-memory cache to avoid re-OCR/re-fetching objective answer keys every student.
OBJECTIVE_KEY_CACHE = {}
OBJECTIVE_KEY_CACHE_MAX = 24

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


def _extract_json_candidate(raw_text):
    """Extract the main JSON object block from model output."""
    text = (raw_text or "").strip()
    if not text:
        return ""

    # Remove fenced blocks when present.
    text = text.replace("```json", "").replace("```JSON", "").replace("```", "").strip()

    start = text.find('{')
    end = text.rfind('}')
    if start == -1 or end == -1 or end < start:
        return ""

    return text[start:end + 1]


def _load_json_with_repairs(candidate):
    """Load JSON string with light repairs for common model formatting issues."""
    repaired = candidate.strip()
    repaired = repaired.replace("“", '"').replace("”", '"').replace("’", "'")
    repaired = re.sub(r",\s*([}\]])", r"\1", repaired)
    return json.loads(repaired)


def call_gemini(ai_inputs,model):
    """Call Gemini with the given inputs and return parsed JSON data."""
    response = model.generate_content(
        ai_inputs,
        generation_config=GENERATION_CONFIG,
        safety_settings=SAFETY_SETTINGS,
    )

    if not response.parts:
        raise ValueError("AI Safety Block — no response parts returned.")

    raw_text = response.text or ""
    candidate = _extract_json_candidate(raw_text)
    if not candidate:
        raise ValueError(f"AI returned invalid JSON: {raw_text[:220]}")

    try:
        return _load_json_with_repairs(candidate)
    except Exception as first_error:
        print(f"⚠️ Initial JSON parse failed: {first_error}. Trying repair pass...")

        repair_prompt = (
            "You are a JSON repair utility. "
            "Return ONLY one strict JSON object with valid syntax. "
            "Do not add explanations, comments, markdown, or code fences."
        )

        repair_response = model.generate_content(
            [repair_prompt, raw_text],
            generation_config=GENERATION_CONFIG,
            safety_settings=SAFETY_SETTINGS,
        )

        repair_text = repair_response.text if repair_response and repair_response.parts else ""
        repair_candidate = _extract_json_candidate(repair_text)
        if not repair_candidate:
            raise ValueError(f"AI returned invalid JSON after repair: {raw_text[:220]}")

        try:
            return _load_json_with_repairs(repair_candidate)
        except Exception as second_error:
            raise ValueError(
                f"AI returned invalid JSON after repair parse: {second_error}"
            )


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


def normalize_url_list(raw_value):
    """Normalize either a URL string, JSON string list, or Python list into a clean URL list."""
    if isinstance(raw_value, list):
        return [u for u in raw_value if isinstance(u, str) and u.startswith("http")]

    if isinstance(raw_value, str):
        value = raw_value.strip()
        if not value:
            return []

        if value.startswith("["):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return [u for u in parsed if isinstance(u, str) and u.startswith("http")]
            except Exception:
                return []

        return [value] if value.startswith("http") else []

    return []


def normalize_exam_settings(raw_settings):
    """Return a defensive normalized exam settings object from request payload."""
    if not isinstance(raw_settings, dict):
        raw_settings = {}

    objective_types = raw_settings.get("objectiveTypes", {})
    if not isinstance(objective_types, dict):
        objective_types = {}

    def _normalize_obj_type(key):
        cfg = objective_types.get(key, {})
        if not isinstance(cfg, dict):
            cfg = {}

        try:
            items = int(cfg.get("items", 0))
        except Exception:
            items = 0

        return {
            "enabled": bool(cfg.get("enabled", False)),
            "items": max(items, 0),
        }

    try:
        total_score = int(raw_settings.get("totalScore", 0))
    except Exception:
        total_score = 0

    professor_instructions = raw_settings.get("professorInstructions", "")
    if not isinstance(professor_instructions, str):
        professor_instructions = str(professor_instructions)

    return {
        "totalScore": max(total_score, 0),
        "professorInstructions": professor_instructions.strip(),
        "objectiveTypes": {
            "multipleChoice": _normalize_obj_type("multipleChoice"),
            "trueFalse": _normalize_obj_type("trueFalse"),
            "identification": _normalize_obj_type("identification"),
        },
    }


def build_exam_settings_block(exam_settings):
    """Create a deterministic plain-text block describing professor exam setup."""
    objective_types = exam_settings.get("objectiveTypes", {})

    def _line(label, key):
        cfg = objective_types.get(key, {})
        enabled = "ENABLED" if cfg.get("enabled") else "DISABLED"
        items = cfg.get("items", 0)
        return f"- {label}: {enabled} ({items} items)"

    instructions = exam_settings.get("professorInstructions", "") or "(none provided)"
    total_score = exam_settings.get("totalScore", 0)

    return (
        "=== PROFESSOR EXAM SETTINGS ===\n"
        f"Total Score Target: {total_score}\n"
        "Objective Sections:\n"
        f"{_line('Multiple Choice', 'multipleChoice')}\n"
        f"{_line('True/False', 'trueFalse')}\n"
        f"{_line('Identification', 'identification')}\n"
        "Professor Instructions:\n"
        f"{instructions}\n"
        "==============================="
    )


def normalize_free_text(value):
    """Normalize free-form text for comparison."""
    text = re.sub(r"[^A-Za-z0-9 ]+", " ", str(value or "").upper())
    return re.sub(r"\s+", " ", text).strip()


def normalize_mc_answer(answer):
    """Normalize multiple-choice answers into a single option token."""
    token = normalize_free_text(answer)
    if not token:
        return ""

    standalone = re.search(r"\b([A-Z])\b", token)
    if standalone:
        return standalone.group(1)

    any_letter = re.search(r"[A-Z]", token)
    if any_letter:
        return any_letter.group(0)

    return token.split(" ")[0]


def normalize_true_false_answer(answer):
    """Normalize true/false answers into canonical TRUE/FALSE labels."""
    token = normalize_free_text(answer)
    if not token:
        return ""

    if "TRUE" in token and "FALSE" not in token:
        return "TRUE"
    if "FALSE" in token and "TRUE" not in token:
        return "FALSE"

    if token == "T":
        return "TRUE"
    if token == "F":
        return "FALSE"

    short = re.search(r"\b(T|F)\b", token)
    if short:
        return "TRUE" if short.group(1) == "T" else "FALSE"

    return token


def normalize_identification_answer(answer):
    """Normalize identification answers for fuzzy matching."""
    token = normalize_free_text(answer)
    token = re.sub(r"\b(THE|A|AN)\b", " ", token)
    return re.sub(r"\s+", " ", token).strip()


def split_identification_options(answer):
    """Split answer-key options like 'A / B' or 'A or B'."""
    normalized = normalize_identification_answer(answer)
    if not normalized:
        return []

    parts = re.split(r"\s*(?:/|;|\bor\b)\s*", normalized, flags=re.I)
    cleaned = [part.strip() for part in parts if part.strip()]
    return cleaned or [normalized]


def extract_numbered_answers(raw_text):
    """Extract numbered answers like '1) A' from arbitrary text."""
    text = str(raw_text or "")
    if not text.strip():
        return {}

    compact = text.replace("\r", "\n").replace("```", " ")
    compact = re.sub(r"[ \t]+", " ", compact)
    compact = re.sub(r"\n+", " ", compact)

    pattern = re.compile(
        r"(\d{1,3})\s*[\)\.:\-]\s*(.+?)(?=(?:\s+\d{1,3}\s*[\)\.:\-])|$)",
        re.S,
    )

    answers = {}
    for match in pattern.finditer(compact):
        try:
            q_num = int(match.group(1))
        except Exception:
            continue

        answer = re.sub(r"\s+", " ", match.group(2)).strip()
        answer = re.sub(r"^(ANS(?:WER)?\s*)[:\-]?\s*", "", answer, flags=re.I)
        if answer:
            answers[q_num] = answer

    return answers


def _shorten_text(value, max_len=42):
    """Create compact answer previews for logs."""
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    if len(text) <= max_len:
        return text
    return text[: max_len - 3] + "..."


def build_objective_ranges(exam_settings):
    """Map enabled objective sections into sequential question ranges."""
    objective_types = exam_settings.get("objectiveTypes", {})
    ranges = []
    cursor = 1

    for key in ("multipleChoice", "trueFalse", "identification"):
        cfg = objective_types.get(key, {})
        enabled = bool(cfg.get("enabled", False))
        try:
            items = int(cfg.get("items", 0))
        except Exception:
            items = 0

        items = max(items, 0)
        if not enabled or items <= 0:
            continue

        start = cursor
        end = cursor + items - 1
        ranges.append((key, start, end))
        cursor = end + 1

    return ranges


def answers_match_for_section(section_key, student_raw, key_raw):
    """Compare student and key answers using section-specific rules."""
    if section_key == "multipleChoice":
        return normalize_mc_answer(student_raw) == normalize_mc_answer(key_raw)

    if section_key == "trueFalse":
        return normalize_true_false_answer(student_raw) == normalize_true_false_answer(key_raw)

    student_norm = normalize_identification_answer(student_raw)
    if not student_norm:
        return False

    for key_option in split_identification_options(key_raw):
        if not key_option:
            continue

        if student_norm == key_option:
            return True

        if len(key_option) >= 4 and key_option in student_norm:
            return True

        if len(student_norm) >= 4 and student_norm in key_option:
            return True

        if SequenceMatcher(None, student_norm, key_option).ratio() >= 0.88:
            return True

    return False


def compute_objective_score(transcribed_text, objective_key_text, exam_settings):
    """Deterministically score objective sections from numbered answer pairs."""
    student_answers = extract_numbered_answers(transcribed_text)
    key_answers = extract_numbered_answers(objective_key_text)
    ranges = build_objective_ranges(exam_settings)

    objective_total = sum((end - start + 1) for _, start, end in ranges)
    if objective_total <= 0:
        return {
            "score": 0,
            "total": 0,
            "feedback": "",
            "log": "",
            "missing_key_count": 0,
            "missing_student_count": 0,
        }

    score = 0
    missing_key_count = 0
    missing_student_count = 0
    section_summaries = []
    question_feedback = []
    log_lines = ["OBJECTIVE SCORE LOG"]

    section_names = {
        "multipleChoice": "Multiple Choice",
        "trueFalse": "True/False",
        "identification": "Identification",
    }

    for section_key, start, end in ranges:
        section_label = section_names.get(section_key, section_key)
        section_correct = 0
        section_total = end - start + 1

        log_lines.append(f"Section: {section_label} ({start}-{end})")

        for q_num in range(start, end + 1):
            student_raw = student_answers.get(q_num, "")
            key_raw = key_answers.get(q_num, "")

            if not key_raw:
                missing_key_count += 1
            if not student_raw:
                missing_student_count += 1

            matched = bool(student_raw and key_raw and answers_match_for_section(section_key, student_raw, key_raw))
            if matched:
                score += 1
                section_correct += 1

            status = "Correct" if matched else "Wrong"
            student_preview = _shorten_text(student_raw or "blank")
            key_preview = _shorten_text(key_raw or "missing key")

            question_feedback.append(
                f"Q{q_num}: {status} (Student: {student_preview} | Key: {key_preview})"
            )
            log_lines.append(
                f"- Q{q_num}: student='{student_preview}' | key='{key_preview}' -> {status}"
            )

        section_summaries.append(f"{section_label}: {section_correct}/{section_total}")
        log_lines.append(f"Section Score: {section_correct}/{section_total}")

    feedback = f"Objective Score: {score}/{objective_total}."
    if section_summaries:
        feedback += " " + " | ".join(section_summaries)
    if question_feedback:
        feedback += "\n" + "\n".join(question_feedback)

    if missing_key_count > 0:
        log_lines.append(f"Missing key answers: {missing_key_count}")
    if missing_student_count > 0:
        log_lines.append(f"Missing student answers: {missing_student_count}")

    return {
        "score": score,
        "total": objective_total,
        "feedback": feedback,
        "log": "\n".join(log_lines).strip(),
        "missing_key_count": missing_key_count,
        "missing_student_count": missing_student_count,
    }


def transcribe_reference_images(images):
    """OCR helper for answer-key images used in deterministic objective scoring."""
    if not images:
        return ""

    ocr_prompt = """
You are an OCR helper for objective answer keys.
Transcribe numbered answers exactly as written.
Return ONLY JSON:
{
  "transcribed_text": "plain transcription"
}
"""

    extracted_texts = []
    batch_size = 5

    for start_idx in range(0, len(images), batch_size):
        batch = images[start_idx:start_idx + batch_size]
        ai_inputs = [ocr_prompt]

        for image in batch:
            buf = io.BytesIO()
            image.save(buf, format='JPEG', quality=90)
            ai_inputs.append({"mime_type": "image/jpeg", "data": buf.getvalue()})

        try:
            data = call_gemini(ai_inputs, transcription_model)
            text = str(data.get("transcribed_text", "")).strip()
            if text:
                extracted_texts.append(text)
                end_idx = start_idx + len(batch)
                print(
                    f"🧾 OCR answer-key batch {start_idx + 1}-{end_idx}: {len(text)} chars"
                )
        except Exception as error:
            print(
                f"⚠️ OCR failed for answer-key batch starting at page {start_idx + 1}: {error}"
            )

    return "\n\n".join(extracted_texts).strip()


def build_objective_cache_key(answer_key_urls):
    """Build a stable cache key for objective answer-key sources."""
    normalized = sorted(
        u.strip()
        for u in answer_key_urls
        if isinstance(u, str) and u.strip()
    )
    return "||".join(normalized)


def set_cached_objective_key(cache_key, value):
    """Store objective key text with a small bounded cache."""
    if not cache_key or not value:
        return

    if cache_key in OBJECTIVE_KEY_CACHE:
        OBJECTIVE_KEY_CACHE.pop(cache_key, None)

    if len(OBJECTIVE_KEY_CACHE) >= OBJECTIVE_KEY_CACHE_MAX:
        oldest_key = next(iter(OBJECTIVE_KEY_CACHE))
        OBJECTIVE_KEY_CACHE.pop(oldest_key, None)

    OBJECTIVE_KEY_CACHE[cache_key] = value


def quota_exceeded_response():
    """Standard 429 payload with retry guidance."""
    response = jsonify({
        "success": False,
        "error": "quota_exceeded",
        "message": "AI service is temporarily unavailable. Please try again in a minute."
    })
    response.status_code = 429
    response.headers["Retry-After"] = "20"
    return response


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

        data = call_gemini(ai_inputs, transcription_model)
        print(f"✅ Transcription done: {len(data.get('transcribed_text', ''))} chars")
        save_transcript_log(data)

        return jsonify({"success": True, "data": data})

    except google.api_core.exceptions.ResourceExhausted as e:
        print(f"⚠️ Quota Exceeded: {e}")
        return quota_exceeded_response()
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        print(f"❌ Transcription Error: {e}")
        return jsonify({"success": False, "error": "server_error", "message": "Something went wrong."}), 500


@app.route('/grade', methods=['POST'])
def grade():
    """
    Step 2: Hybrid grading pipeline.
    - Objective sections are scored deterministically from numbered answers.
    - Essay sections are scored by Gemini using rubric context.
    """
    try:
        body = request.get_json() or {}
        transcribed_text = body.get('transcribed_text', '').strip()
        context = body.get('context', '').strip()
        answer_key_text = body.get('answer_key_text', '').strip()

        answer_key_urls = normalize_url_list(body.get('answer_key_urls', []))
        reference_urls = normalize_url_list(body.get('reference_urls', []))

        if not answer_key_urls:
            answer_key_urls = normalize_url_list(body.get('answer_key_url', ''))
        if not reference_urls:
            reference_urls = normalize_url_list(body.get('reference_url', ''))

        exam_settings = normalize_exam_settings(body.get('exam_settings', {}))
        exam_settings_block = build_exam_settings_block(exam_settings)
        configured_total = max(int(exam_settings.get("totalScore", 0) or 0), 0)

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

        context_block += f"\n\n{exam_settings_block}"

        # FETCH ADDITIONAL RUBRIC/REFERENCE FILES FROM URLS
        extra_images = []
        answer_key_images = []
        objective_key_text_blocks = [answer_key_text] if answer_key_text else []
        objective_cache_key = build_objective_cache_key(answer_key_urls)
        cached_objective_key_text = OBJECTIVE_KEY_CACHE.get(objective_cache_key, "")

        if cached_objective_key_text:
            print("♻️ Using cached objective answer-key extraction.")
            objective_key_text_blocks.append(cached_objective_key_text)

        if not cached_objective_key_text:
            for url in answer_key_urls:
                try:
                    imgs, text = fetch_and_parse_url(url)
                    if text:
                        objective_key_text_blocks.append(text)
                        context_block += f"\n\nANSWER KEY REFERENCE (URL):\n{text}"
                    if imgs:
                        answer_key_images.extend(imgs)
                except Exception as e:
                    print(f"⚠️ Could not fetch URL {url}: {e}")

        for url in reference_urls:
            try:
                imgs, text = fetch_and_parse_url(url)
                if text:
                    context_block += f"\n\nLEARNING MATERIAL / RUBRIC (URL):\n{text}"
                if imgs:
                    extra_images.extend(imgs)
            except Exception as e:
                print(f"⚠️ Could not fetch URL {url}: {e}")

        # OCR answer-key images so objective sections can be scored deterministically.
        if answer_key_images:
            ocr_key_text = transcribe_reference_images(answer_key_images)
            if ocr_key_text:
                objective_key_text_blocks.append(ocr_key_text)
                context_block += f"\n\nANSWER KEY OCR (IMAGE):\n{ocr_key_text}"

        objective_key_text = "\n\n".join(
            block for block in objective_key_text_blocks if isinstance(block, str) and block.strip()
        ).strip()

        if objective_key_text and not cached_objective_key_text:
            set_cached_objective_key(objective_cache_key, objective_key_text)

        objective_result = compute_objective_score(
            transcribed_text,
            objective_key_text,
            exam_settings,
        )

        essay_prompt = f"""
You are a deterministic ESSAY grading engine.

{context_block}

=== STUDENT TRANSCRIPTION ===
{transcribed_text}
=============================

IMPORTANT:
- Objective sections (Multiple Choice / True-False / Identification) are already graded by the server.
- Do NOT include objective points in your "score".
- Grade only essay/subjective responses from the provided rubric context.

RULES:
- Grade only from provided materials.
- Never invent rubric criteria.
- Never exceed the rubric maximum.
- If unsure, choose the lower score.
- If rubric is missing, return score 0 with a short explanation.

Return ONLY this JSON, no extra text:
{{
  "grading_type": "RUBRIC_BASED",
  "essay_score_log": "plain text log",
  "confidence_score": <0-100>,
  "score": <essay-only numeric score>,
  "total": <essay-only total>,
  "feedback": "brief essay feedback"
}}
"""

        essay_ai_data = {}
        essay_error = None
        essay_ai_inputs = [essay_prompt]

        if extra_images:
            essay_ai_inputs.append("The following pages are reference/rubric material:")
            for img in extra_images:
                buf = io.BytesIO()
                img.save(buf, format='JPEG', quality=90)
                essay_ai_inputs.append({"mime_type": "image/jpeg", "data": buf.getvalue()})

        try:
            essay_ai_data = call_gemini(essay_ai_inputs, grading_model)
            if not isinstance(essay_ai_data, dict):
                raise ValueError("AI returned an invalid essay grading payload.")
        except Exception as error:
            essay_error = str(error)
            essay_ai_data = {}
            print(f"⚠️ Essay grading fallback: {essay_error}")

        def _to_int(value, fallback=0):
            try:
                return int(float(value))
            except Exception:
                return fallback

        objective_score = max(_to_int(objective_result.get("score", 0), 0), 0)
        objective_total = max(_to_int(objective_result.get("total", 0), 0), 0)

        essay_score_raw = max(_to_int(essay_ai_data.get("score", 0), 0), 0)
        essay_total_raw = max(_to_int(essay_ai_data.get("total", essay_score_raw), essay_score_raw), 0)

        if configured_total > 0:
            essay_cap = max(configured_total - objective_total, 0)
            essay_score = min(essay_score_raw, essay_cap)
            final_total = configured_total
        else:
            essay_score = essay_score_raw
            final_total = objective_total + max(essay_total_raw, essay_score)

        final_score = objective_score + essay_score
        if final_total > 0:
            final_score = min(final_score, final_total)

        objective_feedback = str(objective_result.get("feedback", "")).strip()
        essay_feedback = str(essay_ai_data.get("feedback", "")).strip()

        feedback_parts = []
        if objective_total > 0 and objective_feedback:
            feedback_parts.append(objective_feedback)
        if essay_feedback:
            feedback_parts.append(f"Essay: {essay_feedback}")
        if essay_error and not essay_feedback:
            feedback_parts.append(
                "Essay rubric grading was unavailable for this attempt; objective sections were still scored successfully."
            )
        if not feedback_parts:
            feedback_parts.append("No feedback generated by AI.")

        objective_log = str(objective_result.get("log", "")).strip()
        essay_log = str(essay_ai_data.get("essay_score_log", "")).strip()

        score_log_parts = []
        if objective_log:
            score_log_parts.append(objective_log)
        if essay_log:
            if essay_log.startswith("ESSAY SCORE LOG"):
                score_log_parts.append(essay_log)
            else:
                score_log_parts.append(f"ESSAY SCORE LOG\n{essay_log}")
        if essay_error and not essay_log:
            score_log_parts.append(
                f"ESSAY SCORE LOG\nSkipped due to AI parsing error: {essay_error}"
            )

        essay_confidence = min(100, max(_to_int(essay_ai_data.get("confidence_score", 0), 0), 0))

        objective_coverage = 0
        if objective_total > 0:
            missing_key = max(_to_int(objective_result.get("missing_key_count", 0), 0), 0)
            objective_coverage = int(
                round(((objective_total - min(missing_key, objective_total)) / objective_total) * 100)
            )

        if objective_coverage and essay_confidence:
            confidence_score = int(round((objective_coverage + essay_confidence) / 2))
        elif essay_confidence:
            confidence_score = essay_confidence
        else:
            confidence_score = objective_coverage

        confidence_score = max(0, min(confidence_score, 100))

        has_objective = objective_total > 0
        has_essay = essay_score > 0 or bool(essay_log)

        if has_objective and has_essay:
            grading_type = "HYBRID_OBJECTIVE_ESSAY"
        elif has_objective:
            grading_type = "OBJECTIVE_STRICT_MATCH"
        else:
            grading_type = str(essay_ai_data.get("grading_type", "RUBRIC_BASED")).strip() or "RUBRIC_BASED"

        response_data = {
            "grading_type": grading_type,
            "essay_score_log": "\n\n".join(part for part in score_log_parts if part).strip(),
            "confidence_score": confidence_score,
            "score": max(final_score, 0),
            "total": final_total if final_total > 0 else max(final_score, 0),
            "feedback": "\n\n".join(part for part in feedback_parts if part).strip(),
            "objective_score": objective_score,
            "objective_total": objective_total,
            "essay_score": essay_score,
            "essay_total": (
                max(final_total - objective_total, 0)
                if configured_total > 0
                else max(essay_total_raw, essay_score)
            ),
        }

        print(
            "✅ Grading done: "
            f"objective={objective_score}/{objective_total}, "
            f"essay={essay_score}, "
            f"final={response_data['score']}/{response_data['total']}"
        )

        return jsonify({"success": True, "data": response_data})

    except google.api_core.exceptions.ResourceExhausted as e:
        print(f"⚠️ Quota Exceeded: {e}")
        return quota_exceeded_response()
    except ValueError as e:
        print(f"⚠️ Grading Validation Error: {e}")
        return jsonify({
            "success": False,
            "error": "invalid_ai_response",
            "message": str(e)
        }), 422
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
        return quota_exceeded_response()
    except Exception as e:
        print(f"❌ Masterlist Error: {e}")
        return jsonify({"success": False, "error": "server_error", "message": "Something went wrong."}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)