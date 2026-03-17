"use client";

import { useCallback } from "react";
import { type NodeProps } from "@xyflow/react";
import { FastForward, Play, Volume2, VolumeX } from "lucide-react";
import BaseNode from "./BaseNode";
import MediaPreview from "@/components/ui/MediaPreview";
import ProgressBar from "@/components/ui/ProgressBar";
import ModelSelector from "@/components/ui/ModelSelector";
import { useWorkflowStore } from "@/stores/workflow-store";
import { generate } from "@/lib/generate";
import { NODE_MODEL_OPTIONS } from "@/lib/models";
import type { VideoExtendNodeData } from "@/types";

const MODEL_OPTIONS = NODE_MODEL_OPTIONS.videoExtendNode;

// Veo 3.1 models support generate_audio
const VEO_FAST = "fal-ai/veo3.1/fast/extend-video";
const VEO_STD = "fal-ai/veo3.1/extend-video";
const LTX = "fal-ai/ltx-2.3/extend-video";

const AUDIO_CAPABLE = new Set([VEO_FAST, VEO_STD]);

export default function VideoExtendNode(props: NodeProps) {
  const data = props.data as unknown as VideoExtendNodeData;
  const { updateNodeData, getConnectedInputs, setPreview } = useWorkflowStore();

  const selectedModel = (data as Record<string, unknown>).selectedModel as string | undefined;
  const generateAudio = data.generateAudio !== false; // default true
  const extendDuration = data.extendDuration || 7;

  const handleGenerate = useCallback(async () => {
    const inputs = getConnectedInputs(props.id);

    // Find video input (source_video handle)
    const videoNode = Object.values(inputs).find(
      (n) => n.type === "videoNode" || n.type === "textToVideoNode" || n.type === "characterSwapNode" || n.type === "compositeNode" || n.type === "videoExtendNode"
    );
    const videoData = videoNode?.data as Record<string, unknown> | undefined;
    const videoUrl = (videoData?.resultUrl || videoData?.fileUrl) as string | undefined;

    // Find optional prompt input
    const promptNode = Object.values(inputs).find((n) => n.type === "promptNode");
    const promptData = promptNode?.data as Record<string, unknown> | undefined;
    const prompt = (promptData?.prompt as string) || "";

    if (!videoUrl) {
      updateNodeData(props.id, {
        status: "error",
        error: "Connect a Video or processor node with a result",
      } as Partial<VideoExtendNodeData>);
      return;
    }

    updateNodeData(props.id, { status: "processing", error: undefined, progressText: "Extending video..." } as Partial<VideoExtendNodeData>);

    try {
      const chosenModel = selectedModel || MODEL_OPTIONS[0].id;

      const modelInputs: Record<string, unknown> = {
        video_url: videoUrl,
      };

      if (prompt) {
        modelInputs.prompt = prompt;
      }

      if (chosenModel === LTX) {
        // LTX-2.3: duration is float, mode is "end" (extend from end)
        modelInputs.duration = extendDuration;
        modelInputs.mode = "end";
        if (!prompt) {
          modelInputs.prompt = "continue the video seamlessly";
        }
      } else {
        // Veo 3.1: duration is string like "7s", supports generate_audio
        modelInputs.duration = `${extendDuration}s`;
        modelInputs.resolution = "720p";
        modelInputs.aspect_ratio = "16:9";
        if (AUDIO_CAPABLE.has(chosenModel)) {
          modelInputs.generate_audio = generateAudio;
        }
        if (!prompt) {
          modelInputs.prompt = "continue the video seamlessly with natural motion";
        }
      }

      const result = await generate(
        chosenModel,
        modelInputs,
        props.id,
        (status) => updateNodeData(props.id, { progressText: status } as Partial<VideoExtendNodeData>),
      );

      updateNodeData(props.id, {
        status: "complete",
        resultUrl: result.resultUrl,
        progressText: undefined,
      } as Partial<VideoExtendNodeData>);
      setPreview(result.resultUrl, result.resultType);
    } catch (err) {
      updateNodeData(props.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Extension failed",
        progressText: undefined,
      } as Partial<VideoExtendNodeData>);
    }
  }, [props.id, data, selectedModel, generateAudio, extendDuration, updateNodeData, getConnectedInputs, setPreview]);

  const currentModel = selectedModel || MODEL_OPTIONS[0].id;
  const isAudioCapable = AUDIO_CAPABLE.has(currentModel);

  return (
    <BaseNode
      {...props}
      data={data}
      color="#8b5cf6"
      icon={<FastForward className="w-4 h-4" />}
      inputs={["source_video", "prompt"]}
      outputs={["video"]}
    >
      <div className="space-y-2">
        <ModelSelector
          models={MODEL_OPTIONS}
          selected={currentModel}
          onChange={(id) => updateNodeData(props.id, { selectedModel: id } as Partial<VideoExtendNodeData>)}
        />

        {/* Duration slider */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <span>Extend Duration</span>
            <span className="text-purple-400 font-medium">{extendDuration}s</span>
          </div>
          <input
            type="range"
            min={2}
            max={15}
            step={1}
            value={extendDuration}
            onChange={(e) => updateNodeData(props.id, { extendDuration: Number(e.target.value) } as Partial<VideoExtendNodeData>)}
            className="w-full h-1 bg-canvas-border rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <div className="flex justify-between text-[9px] text-gray-600">
            <span>2s</span>
            <span>15s</span>
          </div>
        </div>

        {/* Audio toggle */}
        {isAudioCapable && (
          <button
            onClick={() => updateNodeData(props.id, { generateAudio: !generateAudio } as Partial<VideoExtendNodeData>)}
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
            className="w-full flex items-center justify-center gap-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-md px-3 py-1.5 text-xs text-purple-400 transition-colors"
          >
            <Play className="w-3 h-3" />
            Extend Video
          </button>
        )}

        {data.status === "processing" && <ProgressBar label={data.progressText || "Extending video..."} />}

        {data.resultUrl && (
          <MediaPreview url={data.resultUrl} type="video" compact />
        )}
      </div>
    </BaseNode>
  );
}
