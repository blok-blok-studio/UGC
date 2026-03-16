import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limiter";

export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit("upload");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded." },
        { status: 429 }
      );
    }

    const { contentType, fileName } = await request.json();

    if (!contentType || !fileName) {
      return NextResponse.json(
        { error: "Missing contentType or fileName" },
        { status: 400 }
      );
    }

    // Call fal.ai storage initiate endpoint server-side (keeps API key secure)
    const res = await fetch(
      "https://rest.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3",
      {
        method: "POST",
        headers: {
          Authorization: `Key ${process.env.FAL_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content_type: contentType,
          file_name: fileName,
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("Fal initiate failed:", res.status, text);
      return NextResponse.json(
        { error: `Upload failed (${res.status}): ${text.slice(0, 200)}` },
        { status: 500 }
      );
    }

    const data = await res.json();
    // Returns { upload_url, file_url }
    return NextResponse.json(data);
  } catch (err) {
    console.error("Upload initiate failed:", err);
    return NextResponse.json(
      { error: `Upload initiate failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
