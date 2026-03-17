"use client";

import { useCallback } from "react";
import { type NodeProps } from "@xyflow/react";
import { PersonStanding, Play } from "lucide-react";
import BaseNode from "./BaseNode";
import MediaPreview from "@/components/ui/MediaPreview";
import ProgressBar from "@/components/ui/ProgressBar";
import { useWorkflowStore } from "@/stores/workflow-store";
import { generate } from "@/lib/generate";
import { chromaKeyComposite } from "@/lib/chroma-key";
import { uploadFile } from "@/lib/upload";
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

    updateNodeData(props.id, { status: "processing", error: undefined, progressText: "Step 1/3: Transferring motion..." } as Partial<CharacterSwapNodeData>);

    try {
      // ── Step 1: Motion transfer via Kling ──
      // Character copies your movements (generates in character's scene)
      const motionResult = await generate(
        "fal-ai/kling-video/v2.6/pro/motion-control",
        {
          video_url: videoUrl,
          image_url: imageUrl,
          character_orientation: "video",
        },
        props.id,
        (status) => updateNodeData(props.id, { progressText: `Step 1/3: ${status}` } as Partial<CharacterSwapNodeData>),
      );

      // ── Step 2: Remove background → transparent video ──
      updateNodeData(props.id, { progressText: "Step 2/3: Removing background..." } as Partial<CharacterSwapNodeData>);

      const bgResult = await generate(
        "bria/video/background-removal",
        {
          video_url: motionResult.resultUrl,
          background_color: "Transparent",
          output_container_and_codec: "webm_vp9",
        },
        props.id,
        (status) => updateNodeData(props.id, { progressText: `Step 2/3: ${status}` } as Partial<CharacterSwapNodeData>),
      );

      // ── Step 3: Composite character onto YOUR original video ──
      updateNodeData(props.id, { progressText: "Step 3/3: Compositing onto your video..." } as Partial<CharacterSwapNodeData>);

      const compositeFile = await chromaKeyComposite(
        videoUrl,           // YOUR original video (background)
        bgResult.resultUrl, // transparent character video (overlay)
        (pct) => updateNodeData(props.id, { progressText: `Step 3/3: Compositing ${pct}%` } as Partial<CharacterSwapNodeData>),
      );

      // Upload the final composited video
      updateNodeData(props.id, { progressText: "Uploading final video..." } as Partial<CharacterSwapNodeData>);
      const resultUrl = await uploadFile(compositeFile);

      updateNodeData(props.id, {
        status: "complete",
        resultUrl,
        progressText: undefined,
      } as Partial<CharacterSwapNodeData>);
      setPreview(resultUrl, "video");
    } catch (err) {
      updateNodeData(props.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Generation failed",
        progressText: undefined,
      } as Partial<CharacterSwapNodeData>);
    }
  }, [props.id, updateNodeData, getConnectedInputs, setPreview]);

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
          Upload your video + character image → one click
        </p>

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
