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
) => {
  try {
    const formData = new FormData();

    // Handle blob URLs (web) vs file URIs (native)
    if (imageUri.startsWith("blob:")) {
      const blobResponse = await fetch(imageUri);
      const blob = await blobResponse.blob();
      // ✅ Explicitly name the file with .jpg extension
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
    // ✅ If there's an answer key file URL, fetch and attach it
    if (answerKeyUrl) {
      formData.append("answer_key_url", answerKeyUrl);
    }

    console.log("🚀 Sending to AI Server:", AI_SERVER_URL);

    const response = await fetch(`${AI_SERVER_URL}/process_exam`, {
      method: "POST",
      body: formData,
      // No Content-Type header — let browser set it with boundary
    });

    console.log("📡 Status:", response.status);

    const result = await response.json();
    if (!result.success) {
      const messages: Record<string, string> = {
        quota_exceeded: "The AI is busy. Please wait a moment and try again.",
        model_not_found: "AI service is temporarily unavailable.",
        server_error: "Something went wrong. Please try again.",
        "No file uploaded": "No image was received. Please try again.",
      };

      const friendly =
        messages[result.error] || result.message || "An error occurred.";
      throw new Error(friendly);
    }

    return result.data;
  } catch (error) {
    console.error("❌ AI Service Error:", error);
    throw error;
  }
};
