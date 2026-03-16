/**
 * Generate content via fal.ai models.
 * Handles both fast models (immediate result) and slow models (queue + polling).
 */
export interface GenerateResult {
  resultUrl: string;
  resultType: "image" | "video";
}

export async function generate(
  modelId: string,
  inputs: Record<string, unknown>,
  nodeId: string,
  onProgress?: (status: string) => void,
): Promise<GenerateResult> {
  // Step 1: Submit the generation request
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ modelId, inputs, nodeId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Generation failed" }));
    throw new Error(err.error || "Generation failed");
  }

  const data = await res.json();

  // Fast model: result is immediately available
  if (data.status === "complete") {
    return { resultUrl: data.resultUrl, resultType: data.resultType || "image" };
  }

  // Slow model: poll for completion
  if (data.status === "queued" && data.requestId) {
    return pollForResult(data.requestId, data.modelId, onProgress);
  }

  throw new Error("Unexpected response from generation API");
}

async function pollForResult(
  requestId: string,
  modelId: string,
  onProgress?: (status: string) => void,
): Promise<GenerateResult> {
  const maxAttempts = 240; // 20 minutes max (5s intervals)
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise((r) => setTimeout(r, 5000)); // Wait 5s between polls
    attempts++;

    onProgress?.(`Processing... (${attempts * 5}s)`);

    const res = await fetch("/api/generate/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, modelId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Status check failed" }));
      throw new Error(err.error || "Status check failed");
    }

    const data = await res.json();

    if (data.status === "complete" && data.resultUrl) {
      return { resultUrl: data.resultUrl, resultType: data.resultType || "video" };
    }

    if (data.error) {
      throw new Error(data.error);
    }
  }

  throw new Error("Generation timed out after 20 minutes");
}
