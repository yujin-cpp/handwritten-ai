/**
 * Utilities for handling multiple image URIs across screens.
 */

const SEPARATOR = "||";

/**
 * Serialize an array of image URIs into a single string param.
 */
export const serializeImageUrisParam = (uris: string[]): string => {
  return uris.join(SEPARATOR);
};

/**
 * Parse a serialized image URIs param back into an array.
 */
export const parseImageUrisParam = (
  param: string | string[] | undefined,
): string[] => {
  if (!param) return [];

  const raw = Array.isArray(param) ? param[0] : param;
  if (!raw) return [];

  return raw
    .split(SEPARATOR)
    .map((uri) => uri.trim())
    .filter((uri) => uri.length > 0);
};

/**
 * Combines multiple images into a single submission artifact.
 * If only one image, returns it as-is.
 * If multiple images, returns the first one (server handles multi-page via imageUris).
 */
export const createSubmissionArtifact = async (
  imageUris: string[],
): Promise<{ blob: Blob; extension: string; contentType: string }> => {
  if (imageUris.length === 0) {
    throw new Error("No images provided for submission.");
  }

  // Fetch the first image as the main submission file
  const uri = imageUris[0];
  const response = await fetch(uri);
  const blob = await response.blob();

  const isPdf = uri.toLowerCase().includes(".pdf");
  const extension = isPdf ? "pdf" : "jpg";
  const contentType = isPdf ? "application/pdf" : "image/jpeg";

  return { blob, extension, contentType };
};
