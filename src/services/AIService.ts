// src/services/AIService.ts
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
) => {
  try {
    const formData = new FormData();

    // 1. Append the Image
    const filename = imageUri.split("/").pop();
    const match = /\.(\w+)$/.exec(filename || "");
    const type = match ? `image/${match[1]}` : "image/jpeg";

    formData.append("file", {
      uri: imageUri,
      name: filename || "upload.jpg",
      type: type,
    } as any);

    // 2. Append Data
    formData.append("mode", mode);
    formData.append("rubric", context);

    // 3. Send Request (THIS LINE USES THE IMPORT, SO IT WON'T BE DELETED)
    console.log("🚀 Sending to AI Server:", AI_SERVER_URL);

    const response = await fetch(`${AI_SERVER_URL}/process_exam`, {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "AI processing failed");
    }

    return result.data;
  } catch (error) {
    console.error("❌ AI Service Error:", error);
    throw error;
  }
};
