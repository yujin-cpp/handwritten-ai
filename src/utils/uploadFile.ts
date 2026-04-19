import { AI_SERVER_URL } from "../constants/Config";

export const uploadFileViaServer = async (
  uri: string,
  filename: string,
  storagePath: string,
  contentType: string = "application/pdf",
): Promise<string> => {
  const formData = new FormData();
  formData.append("file", {
    uri,
    name: filename,
    type: contentType,
  } as any);
  formData.append("path", storagePath);
  formData.append("contentType", contentType);

  const response = await fetch(`${AI_SERVER_URL}/upload-file`, {
    method: "POST",
    body: formData,
  });

  const json = await response.json();
  if (!json.success) throw new Error(`Upload failed: ${json.error}`);

  console.log("✅ Uploaded:", json.path);
  return json.url; // returns download URL
};
