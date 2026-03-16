"use client";

import { useCallback } from "react";
import { type NodeProps } from "@xyflow/react";
import { Layers, Play } from "lucide-react";
import BaseNode from "./BaseNode";
import MediaPreview from "@/components/ui/MediaPreview";
import ProgressBar from "@/components/ui/ProgressBar";
import { useWorkflowStore } from "@/stores/workflow-store";
import { chromaKeyComposite } from "@/lib/chroma-key";
import { uploadFile } from "@/lib/upload";
import type { CompositeNodeData } from "@/types";

export default function CompositeNode(props: NodeProps) {
  const data = props.data as unknown as CompositeNodeData;
  const { updateNodeData, getConnectedInputs, setPreview } = useWorkflowStore();

  const handleGenerate = useCallback(async () => {
    const inputs = getConnectedInputs(props.id);

    // Get background video (original user video)
    const bgNode = inputs["background_video"] || Object.values(inputs).find(
      (n) => n.type === "videoNode"
    );
    // Get green screen video (from Character Swap)
    const gsNode = inputs["greenscreen_video"] || Object.values(inputs).find(
      (n) => n.type === "characterSwapNode"
    );

    if (!bgNode || !gsNode) {
      updateNodeData(props.id, {
        status: "error",
        error: "Connect a background video and green screen video",
      } as Partial<CompositeNodeData>);
      return;
    }

    const bgData = bgNode.data as Record<string, unknown>;
    const gsData = gsNode.data as Record<string, unknown>;
    const bgUrl = (bgData.fileUrl || bgData.resultUrl) as string | undefined;
    const gsUrl = (gsData.resultUrl || gsData.fileUrl) as string | undefined;

    if (!bgUrl || !gsUrl) {
      updateNodeData(props.id, {
        status: "error",
        error: "Both inputs need completed media",
      } as Partial<CompositeNodeData>);
      return;
    }

    updateNodeData(props.id, {
      status: "processing",
      error: undefined,
      progressText: "Compositing videos...",
    } as Partial<CompositeNodeData>);

    try {
      // Run client-side chroma key compositing
      const compositeFile = await chromaKeyComposite(
        bgUrl,
        gsUrl,
        (pct) => updateNodeData(props.id, {
          progressText: `Compositing: ${pct}%`,
        } as Partial<CompositeNodeData>),
      );

      // Upload the composited video to fal storage
      updateNodeData(props.id, {
        progressText: "Uploading result...",
      } as Partial<CompositeNodeData>);
      const resultUrl = await uploadFile(compositeFile);

      updateNodeData(props.id, {
        status: "complete",
        resultUrl,
        progressText: undefined,
      } as Partial<CompositeNodeData>);
      setPreview(resultUrl, "video");
    } catch (err) {
      updateNodeData(props.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Compositing failed",
        progressText: undefined,
      } as Partial<CompositeNodeData>);
    }
  }, [props.id, updateNodeData, getConnectedInputs, setPreview]);

  return (
    <BaseNode
      {...props}
      data={data}
      color="#8b5cf6"
      icon={<Layers className="w-4 h-4" />}
      inputs={["background_video", "greenscreen_video"]}
      outputs={["video"]}
    >
      <div className="space-y-2">
        <p className="text-[10px] text-gray-500">
          Overlay green screen onto your background
        </p>

        {data.status !== "processing" && (
          <button
            onClick={handleGenerate}
            className="w-full flex items-center justify-center gap-1.5 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 rounded-md px-3 py-1.5 text-xs text-violet-400 transition-colors"
          >
            <Play className="w-3 h-3" />
            Composite Videos
          </button>
        )}

        {data.status === "processing" && (
          <ProgressBar label={data.progressText || "Compositing..."} />
        )}

        {data.resultUrl && (
          <MediaPreview url={data.resultUrl} type="video" compact />
        )}
      </div>
    </BaseNode>
  );
}
