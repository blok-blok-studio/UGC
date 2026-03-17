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

// Seedance reference-to-video supports 1-4 images
const SEEDANCE_REF_MODEL = "fal-ai/bytedance/seedance/v1/lite/reference-to-video";
const SEEDANCE_PRO_MODEL = "fal-ai/bytedance/seedance/v1/pro/image-to-video";

export default function TextToVideoNode(props: NodeProps) {
  const data = props.data as unknown as TextToVideoNodeData;
  const { updateNodeData, getConnectedInputs, setPreview } = useWorkflowStore();

  const selectedModel = (data as Record<string, unknown>).selectedModel as string | undefined;

  const handleGenerate = useCallback(async () => {
    const inputs = getConnectedInputs(props.id);

    // Find prompt input
    const promptNode = Object.values(inputs).find((n) => n.type === "promptNode");
    const promptData = promptNode?.data as unknown as PromptNodeData | undefined;

    // Find ALL connected image nodes (support multiple for Seedance)
    const imageNodes = Object.values(inputs).filter(
      (n) => n.type === "imageNode" || n.type === "productNode"
    );
    const imageUrls: string[] = [];
    for (const node of imageNodes) {
      const d = node.data as Record<string, unknown>;
      if (d.fileUrl) imageUrls.push(d.fileUrl as string);
    }

    if (!promptData?.prompt) {
      updateNodeData(props.id, {
        status: "error",
        error: "Connect a Prompt node with text",
      } as Partial<TextToVideoNodeData>);
      return;
    }

    // Build full prompt
    let fullPrompt = promptData.prompt;
    if (promptData.angle) fullPrompt += `, ${promptData.angle} angle`;
    if (promptData.background) fullPrompt += `, ${promptData.background} background`;
    if (promptData.style) fullPrompt += `, ${promptData.style} style`;

    updateNodeData(props.id, { status: "processing", error: undefined, progressText: "Generating video..." } as Partial<TextToVideoNodeData>);

    try {
      // Auto-select model based on images and user selection
      const chosenModel = selectedModel || autoSelectModel(imageUrls.length);

      const modelInputs: Record<string, unknown> = {
        prompt: fullPrompt,
        duration: promptData.duration || 5,
      };

      // Seedance reference-to-video uses reference_image_urls (array)
      if (chosenModel === SEEDANCE_REF_MODEL) {
        if (imageUrls.length === 0) {
          updateNodeData(props.id, {
            status: "error",
            error: "Seedance Multi-Image needs at least 1 reference image",
          } as Partial<TextToVideoNodeData>);
          return;
        }
        modelInputs.reference_image_urls = imageUrls.slice(0, 4); // max 4
      }
      // Seedance Pro and Kling use image_url (single)
      else if (imageUrls.length > 0) {
        modelInputs.image_url = imageUrls[0];
      }

      const result = await generate(
        chosenModel,
        modelInputs,
        props.id,
        (status) => updateNodeData(props.id, { progressText: status } as Partial<TextToVideoNodeData>),
      );

      updateNodeData(props.id, {
        status: "complete",
        resultUrl: result.resultUrl,
        progressText: undefined,
      } as Partial<TextToVideoNodeData>);
      setPreview(result.resultUrl, result.resultType);
    } catch (err) {
      updateNodeData(props.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Generation failed",
        progressText: undefined,
      } as Partial<TextToVideoNodeData>);
    }
  }, [props.id, data, selectedModel, updateNodeData, getConnectedInputs, setPreview]);

  return (
    <BaseNode
      {...props}
      data={data}
      color="#ec4899"
      icon={<Wand2 className="w-4 h-4" />}
      inputs={["prompt", "reference_image_1", "reference_image_2", "reference_image_3", "reference_image_4"]}
      outputs={["video"]}
    >
      <div className="space-y-2">
        <p className="text-[10px] text-gray-500">
          Prompt + up to 4 reference images → Video
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

        {data.status === "processing" && <ProgressBar label={data.progressText || "Generating video..."} />}

        {data.resultUrl && (
          <MediaPreview url={data.resultUrl} type="video" compact />
        )}
      </div>
    </BaseNode>
  );
}

function autoSelectModel(imageCount: number): string {
  if (imageCount >= 2) return SEEDANCE_REF_MODEL;
  if (imageCount === 1) return SEEDANCE_PRO_MODEL;
  return "fal-ai/kling-video/v3/pro/text-to-video"; // text only fallback
}
