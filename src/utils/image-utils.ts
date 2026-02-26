import fs from "fs/promises";
import path from "path";

/**
 * Read an image file and return a base64-encoded string for LLM vision APIs.
 */
export async function encodeImageToBase64(filePath: string): Promise<{
  base64: string;
  mimeType: string;
}> {
  const buffer = await fs.readFile(filePath);
  const base64 = buffer.toString("base64");

  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
  };

  return {
    base64,
    mimeType: mimeMap[ext] ?? "image/png",
  };
}

/**
 * Describe images in a text format for non-vision LLMs.
 */
export function formatImageReferences(
  images: Array<{ filename: string; description?: string }>
): string {
  if (images.length === 0) return "";
  return (
    "\n\nReference Images Provided:\n" +
    images
      .map(
        (img, i) =>
          `${i + 1}. ${img.filename}${img.description ? ` — ${img.description}` : ""}`
      )
      .join("\n")
  );
}
