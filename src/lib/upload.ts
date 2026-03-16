/**
 * Upload a file to fal.ai storage using presigned URLs.
 * 1. Server initiates upload (keeps API key secure)
 * 2. Client uploads directly to presigned URL (bypasses Vercel body limit)
 */
export async function uploadFile(file: File): Promise<string> {
  // Use the file's native MIME type for upload
  const contentType = file.type || "application/octet-stream";

  // Step 1: Get presigned upload URL from our server
  const initRes = await fetch("/api/upload/initiate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contentType,
      fileName: file.name,
    }),
  });

  if (!initRes.ok) {
    const err = await initRes.json().catch(() => ({ error: "Upload initiation failed" }));
    throw new Error(err.error || "Upload initiation failed");
  }

  const { upload_url, file_url } = await initRes.json();

  // Step 2: Upload file directly to presigned URL (no body size limit)
  const uploadRes = await fetch(upload_url, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": contentType,
    },
  });

  if (!uploadRes.ok) {
    throw new Error("File upload failed");
  }

  return file_url;
}
