import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import { Platform } from "react-native";

export type SubmissionArtifact = {
  blob: Blob;
  contentType: "application/pdf" | "image/jpeg";
  extension: "pdf" | "jpg";
};

export function parseImageUrisParam(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value[0] : value;

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && item.length > 0)
      : [];
  } catch {
    return raw ? [raw] : [];
  }
}

export function serializeImageUrisParam(imageUris: string[]): string {
  return JSON.stringify(imageUris);
}

function buildPdfHtml(images: string[]) {
  const pages = images
    .map(
      (dataUri, index) => `
        <section class="page">
          <div class="page-label">Page ${index + 1}</div>
          <img src="${dataUri}" alt="Answer page ${index + 1}" />
        </section>
      `
    )
    .join("");

  return `
    <html>
      <head>
        <style>
          @page { margin: 18px; }
          body { margin: 0; font-family: Arial, sans-serif; background: #ffffff; }
          .page {
            position: relative;
            width: 100%;
            min-height: 100vh;
            page-break-after: always;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ffffff;
          }
          .page:last-child {
            page-break-after: auto;
          }
          .page-label {
            position: absolute;
            top: 10px;
            right: 10px;
            padding: 6px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 700;
            color: #1f2937;
            background: rgba(229, 231, 235, 0.9);
          }
          img {
            width: 100%;
            height: auto;
            object-fit: contain;
          }
        </style>
      </head>
      <body>${pages}</body>
    </html>
  `;
}

async function imageUriToDataUri(imageUri: string) {
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return `data:image/jpeg;base64,${base64}`;
}

async function createNativeSubmissionPdf(imageUris: string[]): Promise<SubmissionArtifact> {
  const embeddedImages = await Promise.all(imageUris.map((imageUri) => imageUriToDataUri(imageUri)));

  const pdf = await Print.printToFileAsync({
    html: buildPdfHtml(embeddedImages),
    width: 794,
    height: 1123,
  });

  const response = await fetch(pdf.uri);
  const blob = await response.blob();

  return {
    blob,
    contentType: "application/pdf",
    extension: "pdf",
  };
}

async function loadWebImage(uri: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load image: ${uri}`));
    image.src = uri;
  });
}

async function createWebSubmissionImage(imageUris: string[]): Promise<SubmissionArtifact> {
  const images = await Promise.all(imageUris.map((uri) => loadWebImage(uri)));

  const maxWidth = Math.min(
    1800,
    Math.max(...images.map((image) => image.naturalWidth || image.width || 1200))
  );

  const scaledHeights = images.map((image) => {
    const width = image.naturalWidth || image.width || maxWidth;
    const height = image.naturalHeight || image.height || maxWidth * 1.4;
    return Math.round((height / width) * maxWidth);
  });

  const gap = 24;
  const totalHeight =
    scaledHeights.reduce((sum, height) => sum + height, 0) + gap * Math.max(0, images.length - 1);

  const canvas = document.createElement("canvas");
  canvas.width = maxWidth;
  canvas.height = totalHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to prepare the browser canvas for submission.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  let offsetY = 0;
  images.forEach((image, index) => {
    const targetHeight = scaledHeights[index];
    context.drawImage(image, 0, offsetY, maxWidth, targetHeight);
    offsetY += targetHeight + gap;
  });

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => {
        if (value) {
          resolve(value);
          return;
        }
        reject(new Error("Unable to create the combined submission image."));
      },
      "image/jpeg",
      0.92
    );
  });

  return {
    blob,
    contentType: "image/jpeg",
    extension: "jpg",
  };
}

export async function createSubmissionArtifact(
  imageUris: string[]
): Promise<SubmissionArtifact> {
  if (Platform.OS === "web") {
    return await createWebSubmissionImage(imageUris);
  }

  return await createNativeSubmissionPdf(imageUris);
}
