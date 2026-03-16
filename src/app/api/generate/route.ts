import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limiter";
import { sanitizePrompt } from "@/lib/validators";

// Allowlist of model IDs that can be called through this endpoint
// Prevents abuse of the API key to call arbitrary fal.ai models
const ALLOWED_MODELS = new Set([
  "easel-ai/advanced-face-swap",
  "fal-ai/kling-video/v2.6/pro/motion-control",
  "fal-ai/kling-video/v3/pro/text-to-video",
  "fal-ai/kling-video/v3/pro/image-to-video",
  "fal-ai/bytedance/omnihuman/v1.5",
  "fal-ai/bria/rmbg/v2",
  "fal-ai/flux/schnell",
]);

export async function POST(request: NextRequest) {
  try {
    // Rate limit check
    const rateLimit = checkRateLimit("generate");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before generating.", remaining: 0, resetIn: rateLimit.resetIn },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rateLimit.resetIn / 1000).toString(),
          },
        }
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

    // Validate model ID against allowlist
    if (!ALLOWED_MODELS.has(modelId)) {
      return NextResponse.json(
        { error: "Model not allowed" },
        { status: 403 }
      );
    }

    // Sanitize any text prompts in inputs
    const sanitizedInputs = { ...inputs };
    if (sanitizedInputs.prompt && typeof sanitizedInputs.prompt === "string") {
      sanitizedInputs.prompt = sanitizePrompt(sanitizedInputs.prompt);
    }

    // Import and configure fal with server-side key
    const { fal } = await import("@fal-ai/client");
    fal.config({
      credentials: process.env.FAL_KEY,
    });

    // Call the model via fal.ai
    const result = await fal.subscribe(modelId, {
      input: sanitizedInputs,
      logs: true,
      onQueueUpdate: (update) => {
        // Queue updates are logged server-side only
        if (update.status === "IN_PROGRESS") {
          console.log(`[${nodeId}] Generation in progress...`);
        }
      },
    });

    // Extract the result URL based on model output format
    let resultUrl: string | undefined;
    let resultType: "image" | "video" = "image";
    const data = result.data as Record<string, unknown>;

    // Different models return results in different formats
    if (data.video && typeof data.video === "object") {
      const video = data.video as Record<string, unknown>;
      resultUrl = video.url as string;
      resultType = "video";
    } else if (data.image && typeof data.image === "object") {
      const image = data.image as Record<string, unknown>;
      resultUrl = image.url as string;
      resultType = "image";
    } else if (Array.isArray(data.images) && data.images.length > 0) {
      const firstImage = data.images[0] as Record<string, unknown>;
      resultUrl = firstImage.url as string;
      resultType = "image";
    } else if (typeof data.url === "string") {
      resultUrl = data.url;
    }

    if (!resultUrl) {
      return NextResponse.json(
        { error: "No output generated from model" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      nodeId,
      resultUrl,
      resultType,
      metadata: {
        modelId,
        remaining: rateLimit.remaining,
      },
    });
  } catch (error) {
    console.error("Generation failed:", error);
    return NextResponse.json(
      { error: "Generation failed. Please try again." },
      { status: 500 }
    );
  }
}
