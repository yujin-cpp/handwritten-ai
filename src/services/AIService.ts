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
    matching?: ObjectiveSectionConfig;
    enumeration?: ObjectiveSectionConfig;
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
  // On web, always convert URI -> Blob -> File so multipart sends a real file part.
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
/**
 * Sends an image to the Python AI server for grading.
 * @param imageUri - The local URI of the image (from ImagePicker).
 * @param mode - 'grade' or 'masterlist'.
 * @param context - The Rubric or Answer Key.
 */
export const processWithAI = async (
  imageUris: string | string[],
  mode: "grade" | "masterlist",
  context: string,
  answerKeyUrlsOrUrl?: string[] | string,
  referenceUrlsOrUrl?: string[] | string,
  examSettings?: ExamSettingsPayload,
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

    const formData = new FormData();

    for (const uri of uris) {
      await appendImageToFormData(formData, uri);
    }

    formData.append("mode", mode);
    formData.append("rubric", context);
    // Include answer key/reference URL metadata to preserve context across services.
    if (answerKeyUrls.length > 0) {
      formData.append("answer_key_urls", JSON.stringify(answerKeyUrls));
    }
    if (referenceUrls.length > 0) {
      formData.append("reference_urls", JSON.stringify(referenceUrls));
    }

    console.log("Step 1: Transcribing...");
    const transcribeResponse = await fetchWith429Retry(
      () =>
        fetch(`${AI_SERVER_URL}/transcribe`, {
          method: "POST",
          body: formData,
        }),
      "transcribe",
    );
    const transcribeResult = await parseJsonSafe(transcribeResponse);

    if (!transcribeResponse.ok) {
      const message =
        transcribeResult?.message ||
        transcribeResult?.error ||
        `Transcribe request failed (${transcribeResponse.status})`;
      throw new Error(message);
    }

    if (!transcribeResult?.success) {
      throw new Error(transcribeResult?.message || "Transcription failed");
    }
    const { transcribed_text, legibility, confidence_score } =
      transcribeResult.data;
    console.log("✅ Transcription done:", transcribed_text?.slice(0, 100));

    // STEP 2: GRADE
    console.log("Step 2: Grading...");
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
        const malformedMessage =
          gradeResult?.message ||
          "AI returned an invalid grading format. Please retry the scan.";
        throw new Error(malformedMessage);
      }

      const message =
        gradeResult?.message ||
        gradeResult?.error ||
        `Grading request failed (${gradeResponse.status})`;
      throw new Error(message);
    }

    if (!gradeResult?.success) {
      throw new Error(gradeResult?.message || "Grading failed");
    }

    // Merge transcription into grading result
    return {
      ...gradeResult.data,
      transcribed_text,
      legibility,
      confidence_score: gradeResult.data.confidence_score ?? confidence_score,
    };
  } catch (error) {
    console.log("❌ AI Service Error:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("AI service request failed");
  }
};
