import { NextRequest, NextResponse } from "next/server";

const ALLOWED_MODELS = new Set([
  "easel-ai/advanced-face-swap",
  "fal-ai/kling-video/v2.6/pro/motion-control",
  "fal-ai/kling-video/v3/pro/text-to-video",
  "fal-ai/kling-video/v3/pro/image-to-video",
  "fal-ai/bytedance/omnihuman/v1.5",
  "fal-ai/bria/rmbg/v2",
  "fal-ai/flux/schnell",
  "bria/video/background-removal",
]);

export async function POST(request: NextRequest) {
  try {
    const { requestId, modelId } = await request.json();

    if (!requestId || !modelId) {
      return NextResponse.json({ error: "Missing requestId or modelId" }, { status: 400 });
    }

    if (!ALLOWED_MODELS.has(modelId)) {
      return NextResponse.json({ error: "Model not allowed" }, { status: 403 });
    }

    const { fal } = await import("@fal-ai/client");
    fal.config({ credentials: process.env.FAL_KEY });

    const status = await fal.queue.status(modelId, {
      requestId,
      logs: true,
    });

    if (status.status === "COMPLETED") {
      const result = await fal.queue.result(modelId, { requestId });
      const data = result.data as Record<string, unknown>;

      let resultUrl: string | undefined;
      let resultType: "image" | "video" = "image";

      if (data.video && typeof data.video === "object") {
        resultUrl = (data.video as Record<string, unknown>).url as string;
        resultType = "video";
      } else if (data.image && typeof data.image === "object") {
        resultUrl = (data.image as Record<string, unknown>).url as string;
      } else if (Array.isArray(data.images) && data.images.length > 0) {
        resultUrl = (data.images[0] as Record<string, unknown>).url as string;
      } else if (typeof data.url === "string") {
        resultUrl = data.url;
      }

      return NextResponse.json({
        status: "complete",
        resultUrl,
        resultType,
      });
    }

    return NextResponse.json({
      status: status.status === "IN_QUEUE" ? "queued" : "processing",
    });
  } catch (error: unknown) {
    let message = "Unknown error";
    const falError = error as { message?: string; body?: { detail?: Array<{ msg?: string; loc?: string[] }> }; status?: number };
    if (falError.body?.detail) {
      message = falError.body.detail.map((d) => d.msg || JSON.stringify(d)).join("; ");
    } else if (falError.message) {
      message = falError.message;
    }
    console.error("Status check failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
