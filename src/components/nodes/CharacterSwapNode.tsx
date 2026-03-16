"use client";

import { useCallback } from "react";
import { type NodeProps } from "@xyflow/react";
import { PersonStanding, Play } from "lucide-react";
import BaseNode from "./BaseNode";
import MediaPreview from "@/components/ui/MediaPreview";
import ProgressBar from "@/components/ui/ProgressBar";
import { useWorkflowStore } from "@/stores/workflow-store";
import { generate } from "@/lib/generate";
import type { CharacterSwapNodeData } from "@/types";

export default function CharacterSwapNode(props: NodeProps) {
  const data = props.data as unknown as CharacterSwapNodeData;
  const { updateNodeData, getConnectedInputs, setPreview } = useWorkflowStore();

  const handleGenerate = useCallback(async () => {
    const inputs = getConnectedInputs(props.id);
    const videoNode = inputs["reference_video"] || Object.values(inputs).find(
      (n) => (n.data as Record<string, unknown>).fileUrl && n.type === "videoNode"
    );
    const imageNode = inputs["character_image"] || Object.values(inputs).find(
      (n) => (n.data as Record<string, unknown>).fileUrl && n.type !== "videoNode"
    );

    if (!videoNode || !imageNode) {
      updateNodeData(props.id, {
        status: "error",
        error: "Connect a reference video and character image",
      } as Partial<CharacterSwapNodeData>);
      return;
    }

    const videoData = videoNode.data as Record<string, unknown>;
    const imageData = imageNode.data as Record<string, unknown>;
    const videoUrl = videoData.fileUrl as string | undefined;
    const imageUrl = imageData.fileUrl as string | undefined;

    if (!videoUrl || !imageUrl) {
      updateNodeData(props.id, {
        status: "error",
        error: "Both inputs need uploaded files",
      } as Partial<CharacterSwapNodeData>);
      return;
    }

    updateNodeData(props.id, { status: "processing", error: undefined, progressText: "Step 1/2: Transferring motion..." } as Partial<CharacterSwapNodeData>);

    try {
      // ── Step 1: Motion transfer via Kling ──
      const params: Record<string, unknown> = {
        video_url: videoUrl,
        image_url: imageUrl,
        character_orientation: data.orientation || "video",
      };
      if (data.scenePrompt?.trim()) {
        params.prompt = data.scenePrompt.trim();
      }

      const motionResult = await generate(
        "fal-ai/kling-video/v2.6/pro/motion-control",
        params,
        props.id,
        (status) => updateNodeData(props.id, { progressText: `Step 1/2: ${status}` } as Partial<CharacterSwapNodeData>),
      );

      // ── Step 2: Background removal (always run — needed for composite) ──
      updateNodeData(props.id, { progressText: "Step 2/2: Removing background..." } as Partial<CharacterSwapNodeData>);

      const bgResult = await generate(
        "bria/video/background-removal",
        {
          video_url: motionResult.resultUrl,
          background_color: "Green",
          output_container_and_codec: "mp4_h264",
        },
        props.id,
        (status) => updateNodeData(props.id, { progressText: `Step 2/2: ${status}` } as Partial<CharacterSwapNodeData>),
      );

      updateNodeData(props.id, {
        status: "complete",
        resultUrl: bgResult.resultUrl,
        progressText: undefined,
      } as Partial<CharacterSwapNodeData>);
      setPreview(bgResult.resultUrl, "video");
    } catch (err) {
      updateNodeData(props.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Generation failed",
        progressText: undefined,
      } as Partial<CharacterSwapNodeData>);
    }
  }, [props.id, data.orientation, data.scenePrompt, updateNodeData, getConnectedInputs, setPreview]);

  return (
    <BaseNode
      {...props}
      data={data}
      color="#ec4899"
      icon={<PersonStanding className="w-4 h-4" />}
      inputs={["reference_video", "character_image"]}
      outputs={["video"]}
    >
      <div className="space-y-2">
        <p className="text-[10px] text-gray-500">
          Your movements → Character&apos;s body → Your background
        </p>

        {/* Scene prompt */}
        <textarea
          value={data.scenePrompt || ""}
          onChange={(e) => updateNodeData(props.id, { scenePrompt: e.target.value } as Partial<CharacterSwapNodeData>)}
          placeholder="Optional: describe the scene style"
          className="w-full bg-canvas-bg border border-canvas-border rounded px-2 py-1 text-[10px] text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-pink-500/50"
          rows={2}
        />

        {data.status !== "processing" && (
          <button
            onClick={handleGenerate}
            className="w-full flex items-center justify-center gap-1.5 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 rounded-md px-3 py-1.5 text-xs text-pink-400 transition-colors"
          >
            <Play className="w-3 h-3" />
            Generate Character Swap
          </button>
        )}

        {data.status === "processing" && <ProgressBar label={data.progressText || "Processing..."} />}

        {data.resultUrl && (
          <MediaPreview url={data.resultUrl} type="video" compact />
        )}
      </div>
    </BaseNode>
  );
}
