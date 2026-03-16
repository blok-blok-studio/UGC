"use client";

import { useCallback, useState } from "react";
import { type NodeProps } from "@xyflow/react";
import { Layers, Play } from "lucide-react";
import BaseNode from "./BaseNode";
import MediaPreview from "@/components/ui/MediaPreview";
import ProgressBar from "@/components/ui/ProgressBar";
import { useWorkflowStore } from "@/stores/workflow-store";
import { generate } from "@/lib/generate";
import type { BackgroundNodeData } from "@/types";

export default function BackgroundNode(props: NodeProps) {
  const data = props.data as unknown as BackgroundNodeData;
  const { updateNodeData, getConnectedInputs, setPreview } = useWorkflowStore();
  const [bgPrompt, setBgPrompt] = useState(data.backgroundPrompt || "");

  const handleGenerate = useCallback(async () => {
    const inputs = getConnectedInputs(props.id);
    const sourceNode = Object.values(inputs)[0];
    const sourceData = sourceNode?.data as Record<string, unknown> | undefined;
    const sourceUrl = (sourceData?.fileUrl || sourceData?.resultUrl) as string | undefined;

    if (!sourceUrl) {
      updateNodeData(props.id, {
        status: "error",
        error: "Connect a source image or video",
      } as Partial<BackgroundNodeData>);
      return;
    }

    if (!bgPrompt.trim()) {
      updateNodeData(props.id, {
        status: "error",
        error: "Enter a background description",
      } as Partial<BackgroundNodeData>);
      return;
    }

    updateNodeData(props.id, {
      status: "processing",
      error: undefined,
      backgroundPrompt: bgPrompt,
    } as Partial<BackgroundNodeData>);

    try {
      // First remove background
      const bgResult = await generate(
        "fal-ai/bria/rmbg/v2",
        { image_url: sourceUrl },
        props.id,
      );

      // Generate new background image
      const genResult = await generate(
        "fal-ai/flux/schnell",
        {
          prompt: `${bgPrompt}, professional photography background, high quality`,
          num_images: 1,
        },
        props.id,
      );

      // For now, return the background-removed image
      // In production, you'd composite these together
      const finalUrl = bgResult.resultUrl || genResult.resultUrl;
      updateNodeData(props.id, {
        status: "complete",
        resultUrl: finalUrl,
      } as Partial<BackgroundNodeData>);
      setPreview(finalUrl, "image");
    } catch (err) {
      updateNodeData(props.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Generation failed",
      } as Partial<BackgroundNodeData>);
    }
  }, [props.id, bgPrompt, updateNodeData, getConnectedInputs, setPreview]);

  return (
    <BaseNode
      {...props}
      data={data}
      color="#ec4899"
      icon={<Layers className="w-4 h-4" />}
      inputs={["source_media"]}
      outputs={["image"]}
    >
      <div className="space-y-2">
        <input
          type="text"
          value={bgPrompt}
          onChange={(e) => setBgPrompt(e.target.value)}
          placeholder="Describe background..."
          className="w-full bg-canvas-bg border border-canvas-border rounded-md px-2 py-1 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent-primary/50"
        />

        {data.status !== "processing" && (
          <button
            onClick={handleGenerate}
            className="w-full flex items-center justify-center gap-1.5 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 rounded-md px-3 py-1.5 text-xs text-pink-400 transition-colors"
          >
            <Play className="w-3 h-3" />
            Change Background
          </button>
        )}

        {data.status === "processing" && <ProgressBar label="Changing background..." />}

        {data.resultUrl && (
          <MediaPreview url={data.resultUrl} type="image" compact />
        )}
      </div>
    </BaseNode>
  );
}
