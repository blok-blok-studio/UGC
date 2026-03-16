import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limiter";

// Allow longer timeout for large video uploads on Vercel
export const maxDuration = 60;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    // Rate limit check
    const rateLimit = checkRateLimit("upload");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before uploading again." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rateLimit.resetIn / 1000).toString(),
          },
        }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50MB." },
        { status: 400 }
      );
    }

    // Upload to fal.ai storage for use with their models
    const { fal } = await import("@fal-ai/client");

    // Configure with server-side key for upload
    fal.config({
      credentials: process.env.FAL_KEY,
    });

    const fileBuffer = await file.arrayBuffer();
    const url = await fal.storage.upload(
      new Blob([fileBuffer], { type: file.type })
    );

    return NextResponse.json({
      url,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });
  } catch {
    console.error("Upload failed");
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
