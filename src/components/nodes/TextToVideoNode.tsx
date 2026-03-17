"use client";

import { useCallback } from "react";
import { type NodeProps } from "@xyflow/react";
import { Wand2, Play, Volume2, VolumeX } from "lucide-react";
import BaseNode from "./BaseNode";
import MediaPreview from "@/components/ui/MediaPreview";
import ProgressBar from "@/components/ui/ProgressBar";
import ModelSelector from "@/components/ui/ModelSelector";
import { useWorkflowStore } from "@/stores/workflow-store";
import { generate } from "@/lib/generate";
import { NODE_MODEL_OPTIONS } from "@/lib/models";
import type { TextToVideoNodeData, PromptNodeData } from "@/types";

const MODEL_OPTIONS = NODE_MODEL_OPTIONS.textToVideoNode;

// Seedance 1.5 Pro models (with audio)
const SEEDANCE_15_IMAGE = "fal-ai/bytedance/seedance/v1.5/pro/image-to-video";
const SEEDANCE_15_TEXT = "fal-ai/bytedance/seedance/v1.5/pro/text-to-video";
// Seedance 1.0 models (no audio)
const SEEDANCE_REF_MODEL = "fal-ai/bytedance/seedance/v1/lite/reference-to-video";
const SEEDANCE_PRO_MODEL = "fal-ai/bytedance/seedance/v1/pro/image-to-video";

// Models that support generate_audio
const AUDIO_CAPABLE_MODELS = new Set([SEEDANCE_15_IMAGE, SEEDANCE_15_TEXT]);

export default function TextToVideoNode(props: NodeProps) {
  const data = props.data as unknown as TextToVideoNodeData;
  const { updateNodeData, getConnectedInputs, setPreview } = useWorkflowStore();

  const selectedModel = (data as Record<string, unknown>).selectedModel as string | undefined;
  const generateAudio = data.generateAudio !== false; // default true
  const resolution = data.resolution || "720p";

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
        duration: String(promptData.duration || 5),
        resolution,
      };

      // Add audio generation for 1.5 models
      if (AUDIO_CAPABLE_MODELS.has(chosenModel)) {
        modelInputs.generate_audio = generateAudio;
      }

      // Seedance 1.0 reference-to-video uses reference_image_urls (array)
      if (chosenModel === SEEDANCE_REF_MODEL) {
        if (imageUrls.length === 0) {
          updateNodeData(props.id, {
            status: "error",
            error: "Seedance Multi-Image needs at least 1 reference image",
          } as Partial<TextToVideoNodeData>);
          return;
        }
        modelInputs.reference_image_urls = imageUrls.slice(0, 4);
      }
      // Seedance 1.5 and 1.0 Pro use image_url (single)
      else if (chosenModel === SEEDANCE_15_IMAGE || chosenModel === SEEDANCE_PRO_MODEL) {
        if (imageUrls.length === 0) {
          updateNodeData(props.id, {
            status: "error",
            error: "This model needs at least 1 reference image",
          } as Partial<TextToVideoNodeData>);
          return;
        }
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
  }, [props.id, data, selectedModel, generateAudio, resolution, updateNodeData, getConnectedInputs, setPreview]);

  const currentModel = selectedModel || MODEL_OPTIONS[0].id;
  const isAudioCapable = AUDIO_CAPABLE_MODELS.has(currentModel);

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
        <ModelSelector
          models={MODEL_OPTIONS}
          selected={currentModel}
          onChange={(id) => updateNodeData(props.id, { selectedModel: id } as Partial<TextToVideoNodeData>)}
        />

        {/* Resolution picker */}
        <div className="flex gap-1">
          {(["480p", "720p", "1080p"] as const).map((res) => (
            <button
              key={res}
              onClick={() => updateNodeData(props.id, { resolution: res } as Partial<TextToVideoNodeData>)}
              className={`text-[10px] px-2 py-0.5 rounded border flex-1 transition-colors ${
                resolution === res
                  ? "bg-pink-500/20 border-pink-500/50 text-pink-400"
                  : "border-canvas-border text-gray-500 hover:text-gray-300"
              }`}
            >
              {res}
            </button>
          ))}
        </div>

        {/* Audio toggle (only for 1.5 models) */}
        {isAudioCapable && (
          <button
            onClick={() => updateNodeData(props.id, { generateAudio: !generateAudio } as Partial<TextToVideoNodeData>)}
            className={`w-full flex items-center justify-center gap-1.5 rounded-md px-3 py-1 text-[10px] border transition-colors ${
              generateAudio
                ? "bg-orange-500/20 border-orange-500/40 text-orange-400"
                : "bg-canvas-bg border-canvas-border text-gray-500"
            }`}
          >
            {generateAudio ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            {generateAudio ? "Audio ON" : "Audio OFF"}
          </button>
        )}

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
  if (imageCount >= 2) return SEEDANCE_REF_MODEL; // multi-image only on v1
  if (imageCount === 1) return SEEDANCE_15_IMAGE;  // 1.5 Pro with audio
  return SEEDANCE_15_TEXT;                          // 1.5 Pro text-only with audio
}
