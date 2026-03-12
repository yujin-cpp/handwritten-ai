import { AI_SERVER_URL } from "../constants/Config";
/**
 * Sends an image to the Python AI server for grading.
 * @param imageUri - The local URI of the image (from ImagePicker).
 * @param mode - 'grade' or 'masterlist'.
 * @param context - The Rubric or Answer Key.
 */
export const processWithAI = async (
  imageUri: string,
  mode: "grade" | "masterlist",
  context: string,
  answerKeyUrl?: string,
  referencePdfUrl?: string,
) => {
  try {
    const formData = new FormData();

    // Handle blob URLs (web) vs file URIs (native)
    if (imageUri.startsWith("blob:")) {
      const blobResponse = await fetch(imageUri);
      const blob = await blobResponse.blob();
      //  Explicitly name the file with .jpg extension
      const file = new File([blob], "upload.jpg", { type: "image/jpeg" });
      formData.append("file", file);
    } else {
      // Append the Image
      const filename = imageUri.split("/").pop() || "upload.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";
      formData.append("file", { uri: imageUri, name: filename, type } as any);
    }

    formData.append("mode", mode);
    formData.append("rubric", context);
    //  If there's an answer key file URL, fetch and attach it
    if (answerKeyUrl) {
      formData.append("answer_key_url", answerKeyUrl);
    }
    if (referencePdfUrl) {
      formData.append("reference_url", referencePdfUrl);
    }

    console.log("📝 Step 1: Transcribing...");
    const transcribeResponse = await fetch(`${AI_SERVER_URL}/transcribe`, {
      method: "POST",
      body: formData,
    });
    const transcribeResult = await transcribeResponse.json();

    if (!transcribeResult.success) throw new Error("Transcription failed");
    const { transcribed_text, legibility, confidence_score } =
      transcribeResult.data;
    console.log("✅ Transcription done:", transcribed_text?.slice(0, 100));

    // STEP 2: GRADE
    console.log("📊 Step 2: Grading...");
    const gradeResponse = await fetch(`${AI_SERVER_URL}/grade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcribed_text,
        context,
        mode,
        answer_key_url: answerKeyUrl ?? "",
        reference_url: referencePdfUrl ?? "",
      }),
    });

    const gradeResult = await gradeResponse.json();
    if (!gradeResult.success) throw new Error("Grading failed");

    // Merge transcription into grading result
    return {
      ...gradeResult.data,
      transcribed_text,
      legibility,
      confidence_score: gradeResult.data.confidence_score ?? confidence_score,
    };
  } catch (error) {
    console.error("❌ AI Service Error:", error);
    throw error;
  }
};
