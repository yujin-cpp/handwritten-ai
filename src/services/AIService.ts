import { getDownloadURL, ref } from "firebase/storage";
import { AI_SERVER_URL } from "../constants/Config";
import { storage } from "../firebase/firebaseConfig";

const resolveDownloadUrl = async (pathOrUrl: string): Promise<string> => {
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("https://")) return pathOrUrl; // already a signed URL
  try {
    return await getDownloadURL(ref(storage, pathOrUrl));
  } catch {
    console.warn("⚠️ Could not resolve download URL for:", pathOrUrl);
    return "";
  }
};

export const processWithAI = async (
  imageUris: string | string[],
  mode: "grade" | "masterlist",
  context: string,
  answerKeyUrl?: string,
  referencePdfUrl?: string,
) => {
  try {
    const formData = new FormData();
    const uris = Array.isArray(imageUris) ? imageUris : [imageUris];
    console.log(`🖼️ Processing ${uris.length} image(s)`);

    uris.forEach((uri, index) => {
      console.log(`📎 Image ${index + 1}:`, uri.slice(0, 60));
      const isPdf = uri.toLowerCase().includes(".pdf");
      formData.append("file", {
        uri,
        name: isPdf ? `upload-${index + 1}.pdf` : `upload-${index + 1}.jpg`,
        type: isPdf ? "application/pdf" : "image/jpeg",
      } as any);
    });

    formData.append("mode", mode);
    formData.append("rubric", context);
    if (answerKeyUrl) formData.append("answer_key_url", answerKeyUrl);
    if (referencePdfUrl) formData.append("reference_url", referencePdfUrl);

    // STEP 1: TRANSCRIBE
    console.log("Step 1: Transcribing...");
    let transcribeResponse: Response;
    try {
      transcribeResponse = await fetch(`${AI_SERVER_URL}/transcribe`, {
        method: "POST",
        body: formData,
      });
      console.log("📡 Transcribe status:", transcribeResponse.status);
    } catch (error: any) {
      throw new Error(
        `Cannot reach AI server at ${AI_SERVER_URL}. Check your IP. Error: ${error.message}`,
      );
    }

    const rawText = await transcribeResponse.text();
    console.log("📄 Transcribe response:", rawText.slice(0, 300));
    const transcribeResult = JSON.parse(rawText);

    if (!transcribeResult.success)
      throw new Error(`Transcription failed: ${rawText.slice(0, 200)}`);

    const { transcribed_text, legibility, confidence_score } =
      transcribeResult.data;

    // ✅ RESOLVE FIREBASE STORAGE PATHS → SIGNED DOWNLOAD URLs
    const resolvedAnswerKeyUrl = await resolveDownloadUrl(answerKeyUrl ?? "");
    const resolvedReferenceUrl = await resolveDownloadUrl(
      referencePdfUrl ?? "",
    );
    console.log("🔗 Resolved answerKeyUrl:", resolvedAnswerKeyUrl.slice(0, 80));
    console.log("🔗 Resolved referenceUrl:", resolvedReferenceUrl.slice(0, 80));

    // STEP 2: GRADE
    console.log("Step 2: Grading...");
    const gradeResponse = await fetch(`${AI_SERVER_URL}/grade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcribed_text,
        context,
        mode,
        answer_key_url: resolvedAnswerKeyUrl, // ✅ signed URL, not storage path
        reference_url: resolvedReferenceUrl, // ✅ signed URL, not storage path
      }),
    });

    const gradeRawText = await gradeResponse.text();
    console.log("📡 Grade status:", gradeResponse.status);
    const gradeResult = JSON.parse(gradeRawText);

    if (!gradeResult.success)
      throw new Error(`Grading failed: ${gradeRawText.slice(0, 200)}`);

    console.log("🎉 Score:", gradeResult.data?.score);

    return {
      ...gradeResult.data,
      transcribed_text,
      legibility,
      confidence_score: gradeResult.data.confidence_score ?? confidence_score,
    };
  } catch (error: any) {
    console.log("❌ AI Service Error:", error.message);
    throw error;
  }
};
