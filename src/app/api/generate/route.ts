import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limiter";
import { sanitizePrompt } from "@/lib/validators";

// Allowlist of model IDs that can be called through this endpoint
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

// Fast models that complete quickly (< 30s) - use subscribe
const FAST_MODELS = new Set([
  "fal-ai/bria/rmbg/v2",
  "fal-ai/flux/schnell",
  "easel-ai/advanced-face-swap",
]);

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit("generate");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before generating.", remaining: 0, resetIn: rateLimit.resetIn },
        { status: 429, headers: { "Retry-After": Math.ceil(rateLimit.resetIn / 1000).toString() } }
      );
    }

    const body = await request.json();
    const { modelId, inputs, nodeId } = body;

    if (!modelId || !inputs || !nodeId) {
      return NextResponse.json(
        { error: "Missing required fields: modelId, inputs, nodeId" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MODELS.has(modelId)) {
      return NextResponse.json({ error: "Model not allowed" }, { status: 403 });
    }

    const sanitizedInputs = { ...inputs };
    if (sanitizedInputs.prompt && typeof sanitizedInputs.prompt === "string") {
      sanitizedInputs.prompt = sanitizePrompt(sanitizedInputs.prompt);
    }

    const { fal } = await import("@fal-ai/client");
    fal.config({ credentials: process.env.FAL_KEY });

    if (FAST_MODELS.has(modelId)) {
      // Fast models: use subscribe (blocking, completes within timeout)
      const result = await fal.subscribe(modelId, {
        input: sanitizedInputs,
        logs: true,
      });

      const { resultUrl, resultType } = extractResult(result.data as Record<string, unknown>);
      if (!resultUrl) {
        return NextResponse.json({ error: "No output generated from model" }, { status: 500 });
      }

      return NextResponse.json({ nodeId, resultUrl, resultType, status: "complete" });
    } else {
      // Slow models: submit to queue, return request_id for polling
      const { request_id } = await fal.queue.submit(modelId, {
        input: sanitizedInputs,
      });

      return NextResponse.json({
        nodeId,
        requestId: request_id,
        modelId,
        status: "queued",
      });
    }
  } catch (error: unknown) {
    let message = "Unknown error";
    // fal.ai client errors have a body with validation details
    const falError = error as { message?: string; body?: { detail?: Array<{ msg?: string; loc?: string[] }> }; status?: number };
    if (falError.body?.detail) {
      const details = falError.body.detail.map((d) => d.msg || JSON.stringify(d)).join("; ");
      message = details;
    } else if (falError.message) {
      message = falError.message;
    }
    console.error("Generation failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function extractResult(data: Record<string, unknown>): { resultUrl?: string; resultType: "image" | "video" } {
  if (data.video && typeof data.video === "object") {
    return { resultUrl: (data.video as Record<string, unknown>).url as string, resultType: "video" };
  }
  if (data.image && typeof data.image === "object") {
    return { resultUrl: (data.image as Record<string, unknown>).url as string, resultType: "image" };
  }
  if (Array.isArray(data.images) && data.images.length > 0) {
    return { resultUrl: (data.images[0] as Record<string, unknown>).url as string, resultType: "image" };
  }
  if (typeof data.url === "string") {
    return { resultUrl: data.url, resultType: "image" };
  }
  return { resultType: "image" };
}
