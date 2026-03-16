"use client";

import { useCallback } from "react";
import { type NodeProps } from "@xyflow/react";
import { Wand2, Play } from "lucide-react";
import BaseNode from "./BaseNode";
import MediaPreview from "@/components/ui/MediaPreview";
import ProgressBar from "@/components/ui/ProgressBar";
import ModelSelector from "@/components/ui/ModelSelector";
import { useWorkflowStore } from "@/stores/workflow-store";
import { generate } from "@/lib/generate";
import { NODE_MODEL_OPTIONS } from "@/lib/models";
import type { TextToVideoNodeData, PromptNodeData } from "@/types";

const MODEL_OPTIONS = NODE_MODEL_OPTIONS.textToVideoNode;

export default function TextToVideoNode(props: NodeProps) {
  const data = props.data as unknown as TextToVideoNodeData;
  const { updateNodeData, getConnectedInputs, setPreview } = useWorkflowStore();

  const selectedModel = (data as Record<string, unknown>).selectedModel as string | undefined;

  const handleGenerate = useCallback(async () => {
    const inputs = getConnectedInputs(props.id);

    // Find prompt input
    const promptNode = Object.values(inputs).find((n) => n.type === "promptNode");
    const promptData = promptNode?.data as unknown as PromptNodeData | undefined;

    // Find optional reference image
    const imageNode = Object.values(inputs).find(
      (n) => n.type === "imageNode" || n.type === "productNode"
    );
    const imageData = imageNode?.data as Record<string, unknown> | undefined;

    if (!promptData?.prompt) {
      updateNodeData(props.id, {
        status: "error",
        error: "Connect a Prompt node with text",
      } as Partial<TextToVideoNodeData>);
      return;
    }

    // Build full prompt with angle and background context
    let fullPrompt = promptData.prompt;
    if (promptData.angle) fullPrompt += `, ${promptData.angle} angle`;
    if (promptData.background) fullPrompt += `, ${promptData.background} background`;
    if (promptData.style) fullPrompt += `, ${promptData.style} style`;

    updateNodeData(props.id, { status: "processing", error: undefined } as Partial<TextToVideoNodeData>);

    try {
      const imageUrl = imageData?.fileUrl as string | undefined;

      // Use selected model, or auto-detect based on whether image is connected
      const nodeData = data as Record<string, unknown>;
      const modelId = (nodeData.selectedModel as string) || (imageUrl
        ? "fal-ai/kling-video/v3/pro/image-to-video"
        : "fal-ai/kling-video/v3/pro/text-to-video");

      const modelInputs: Record<string, unknown> = {
        prompt: fullPrompt,
        duration: promptData.duration || 5,
      };
      if (imageUrl) {
        modelInputs.image_url = imageUrl;
      }

      const result = await generate(
        modelId,
        modelInputs,
        props.id,
        (status) => updateNodeData(props.id, { progressText: status } as Partial<TextToVideoNodeData>),
      );

      updateNodeData(props.id, {
        status: "complete",
        resultUrl: result.resultUrl,
      } as Partial<TextToVideoNodeData>);
      setPreview(result.resultUrl, result.resultType);
    } catch (err) {
      updateNodeData(props.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Generation failed",
      } as Partial<TextToVideoNodeData>);
    }
  }, [props.id, data, updateNodeData, getConnectedInputs, setPreview]);

  return (
    <BaseNode
      {...props}
      data={data}
      color="#ec4899"
      icon={<Wand2 className="w-4 h-4" />}
      inputs={["prompt", "reference_image"]}
      outputs={["video"]}
    >
      <div className="space-y-2">
        <p className="text-[10px] text-gray-500">
          Prompt + optional image → Video
        </p>

        <ModelSelector
          models={MODEL_OPTIONS}
          selected={selectedModel || MODEL_OPTIONS[0].id}
          onChange={(id) => updateNodeData(props.id, { selectedModel: id } as Partial<TextToVideoNodeData>)}
        />

        {data.status !== "processing" && (
          <button
            onClick={handleGenerate}
            className="w-full flex items-center justify-center gap-1.5 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 rounded-md px-3 py-1.5 text-xs text-pink-400 transition-colors"
          >
            <Play className="w-3 h-3" />
            Generate Video
          </button>
        )}

        {data.status === "processing" && <ProgressBar label="Generating video..." />}

        {data.resultUrl && (
          <MediaPreview url={data.resultUrl} type="video" compact />
        )}
      </div>
    </BaseNode>
  );
}
