import { Platform } from "react-native";
import { AI_SERVER_URL } from "../constants/Config";

export type ObjectiveSectionConfig = {
  enabled: boolean;
  items: number;
};

export type ExamSettingsPayload = {
  totalScore?: number;
  professorInstructions?: string;
  objectiveTypes?: {
    multipleChoice?: ObjectiveSectionConfig;
    trueFalse?: ObjectiveSectionConfig;
    identification?: ObjectiveSectionConfig;
  };
};

const parseJsonSafe = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const fetchWith429Retry = async (
  requestFactory: () => Promise<Response>,
  label: string,
  maxRetries = 2,
) => {
  let attempt = 0;

  while (true) {
    const response = await requestFactory();
    if (response.status !== 429 || attempt >= maxRetries) {
      return response;
    }

    const retryAfterSeconds = Number(response.headers.get("Retry-After"));
    const retryDelayMs =
      Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? retryAfterSeconds * 1000
        : 1200 * Math.pow(2, attempt + 1);

    console.warn(
      `[AIService] ${label} hit rate limit (429). Retrying in ${retryDelayMs}ms...`,
    );

    await sleep(retryDelayMs);
    attempt += 1;
  }
};

const resolveMimeTypeFromUri = (uri: string) => {
  const cleanUri = uri.split("?")[0];
  const match = /\.([a-zA-Z0-9]+)$/.exec(cleanUri);
  const ext = match?.[1]?.toLowerCase();

  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  return "image/jpeg";
};

const resolveFileNameFromUri = (uri: string) => {
  const cleanUri = uri.split("?")[0];
  const name = cleanUri.split("/").pop() || "upload.jpg";
  return name.includes(".") ? name : `${name}.jpg`;
};

const appendImageToFormData = async (formData: FormData, imageUri: string) => {
  if (Platform.OS === "web") {
    const blobResponse = await fetch(imageUri);
    if (!blobResponse.ok) {
      throw new Error("Unable to read selected image for upload.");
    }

    const blob = await blobResponse.blob();
    const fallbackType = resolveMimeTypeFromUri(imageUri);
    const type = blob.type || fallbackType;
    const filename = resolveFileNameFromUri(imageUri);
    const file = new File([blob], filename, { type });
    formData.append("file", file);
    return;
  }

  // Native path (Android/iOS)
  const filename = resolveFileNameFromUri(imageUri);
  const type = resolveMimeTypeFromUri(imageUri);
  formData.append("file", { uri: imageUri, name: filename, type } as any);
};

// ==========================================
// ASYNC JOB POLLING
// ==========================================

/**
 * Submits files to /transcribe/async and polls /job/<id> until done.
 * @param formData - The FormData with all file parts already appended.
 * @param onStatusUpdate - Optional callback to report progress to the UI.
 * @param pollIntervalMs - How often to poll (default: 2000ms).
 * @param timeoutMs - Max wait time before giving up (default: 3 minutes).
 */
const transcribeAsync = async (
  formData: FormData,
  onStatusUpdate?: (status: string) => void,
  pollIntervalMs = 2000,
  timeoutMs = 180_000,
): Promise<{
  transcribed_text: string;
  legibility: string;
  confidence_score: number;
  pages: number;
}> => {
  // Step 1: Submit job
  const submitResponse = await fetchWith429Retry(
    () =>
      fetch(`${AI_SERVER_URL}/transcribe/async`, {
        method: "POST",
        body: formData,
      }),
    "transcribe/async",
  );

  const submitResult = await parseJsonSafe(submitResponse);

  if (!submitResponse.ok || !submitResult?.success) {
    const message =
      submitResult?.message ||
      submitResult?.error ||
      `Transcribe submit failed (${submitResponse.status})`;
    throw new Error(message);
  }

  const { job_id } = submitResult;
  console.log(`📥 Transcription job queued: ${job_id}`);
  onStatusUpdate?.("Transcription queued...");

  // Step 2: Poll until done or timeout
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await sleep(pollIntervalMs);

    const pollResponse = await fetch(`${AI_SERVER_URL}/job/${job_id}`);
    const pollResult = await parseJsonSafe(pollResponse);

    if (!pollResult?.success) {
      throw new Error("Failed to poll job status.");
    }

    const { status, result, error } = pollResult;
    console.log(`🔄 Job ${job_id} status: ${status}`);

    if (status === "done") {
      onStatusUpdate?.("Transcription complete!");
      return result;
    }

    if (status === "error") {
      throw new Error(error || "Transcription job failed on server.");
    }

    // status === "queued" or "processing" — keep polling
    onStatusUpdate?.(
      status === "queued" ? "Waiting in queue..." : "Processing pages...",
    );
  }

  throw new Error("Transcription timed out. Please try again.");
};

// ==========================================
// MAIN EXPORT
// ==========================================

/**
 * Sends images to the AI server for transcription + grading.
 * Transcription uses the async job queue; grading is still synchronous.
 */
export const processWithAI = async (
  imageUris: string | string[],
  mode: "grade" | "masterlist",
  context: string,
  answerKeyUrlsOrUrl?: string[] | string,
  referenceUrlsOrUrl?: string[] | string,
  examSettings?: ExamSettingsPayload,
  onStatusUpdate?: (status: string) => void,
) => {
  try {
    const uris = Array.isArray(imageUris) ? imageUris : [imageUris];

    const answerKeyUrls = Array.isArray(answerKeyUrlsOrUrl)
      ? answerKeyUrlsOrUrl.filter(Boolean)
      : answerKeyUrlsOrUrl
        ? [answerKeyUrlsOrUrl]
        : [];

    const referenceUrls = Array.isArray(referenceUrlsOrUrl)
      ? referenceUrlsOrUrl.filter(Boolean)
      : referenceUrlsOrUrl
        ? [referenceUrlsOrUrl]
        : [];

    // Build FormData with all files
    const formData = new FormData();
    for (const uri of uris) {
      await appendImageToFormData(formData, uri);
    }
    formData.append("mode", mode);
    formData.append("rubric", context);
    if (answerKeyUrls.length > 0) {
      formData.append("answer_key_urls", JSON.stringify(answerKeyUrls));
    }
    if (referenceUrls.length > 0) {
      formData.append("reference_urls", JSON.stringify(referenceUrls));
    }

    // STEP 1: TRANSCRIBE (async with polling)
    console.log("Step 1: Transcribing (async)...");
    onStatusUpdate?.("Uploading exam...");

    const { transcribed_text, legibility, confidence_score } =
      await transcribeAsync(formData, onStatusUpdate);

    console.log("✅ Transcription done:", transcribed_text?.slice(0, 100));

    // STEP 2: GRADE (synchronous — fast, text-only)
    console.log("Step 2: Grading...");
    onStatusUpdate?.("Grading...");

    const gradeResponse = await fetchWith429Retry(
      () =>
        fetch(`${AI_SERVER_URL}/grade`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcribed_text,
            context,
            mode,
            answer_key_url: answerKeyUrls[0] ?? "",
            reference_url: referenceUrls[0] ?? "",
            answer_key_urls: answerKeyUrls,
            reference_urls: referenceUrls,
            exam_settings: examSettings ?? {},
          }),
        }),
      "grade",
    );

    const gradeResult = await parseJsonSafe(gradeResponse);

    if (!gradeResponse.ok) {
      if (gradeResponse.status === 422) {
        throw new Error(
          gradeResult?.message ||
            "AI returned an invalid grading format. Please retry the scan.",
        );
      }
      throw new Error(
        gradeResult?.message ||
          gradeResult?.error ||
          `Grading request failed (${gradeResponse.status})`,
      );
    }

    if (!gradeResult?.success) {
      throw new Error(gradeResult?.message || "Grading failed");
    }

    onStatusUpdate?.("Done!");

    // Merge transcription into grading result
    return {
      ...gradeResult.data,
      transcribed_text,
      legibility,
      confidence_score: gradeResult.data.confidence_score ?? confidence_score,
    };
  } catch (error) {
    console.log("❌ AI Service Error:", error);
    if (error instanceof Error) throw error;
    throw new Error("AI service request failed");
  }
};
