"use client";

import { useCallback, useEffect } from "react";
import { type NodeProps } from "@xyflow/react";
import { Download, ExternalLink } from "lucide-react";
import BaseNode from "./BaseNode";
import MediaPreview from "@/components/ui/MediaPreview";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { OutputNodeData } from "@/types";

export default function OutputNode(props: NodeProps) {
  const data = props.data as unknown as OutputNodeData;
  const { updateNodeData, getConnectedInputs, setPreview } = useWorkflowStore();
  // Subscribe to nodes so we re-render when upstream nodes change
  const allNodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);

  // Watch for incoming data from connected nodes
  useEffect(() => {
    const inputs = getConnectedInputs(props.id);
    const sourceNode = Object.values(inputs)[0];
    if (!sourceNode?.data) return;

    const sourceData = sourceNode.data as Record<string, unknown>;
    const resultUrl = sourceData.resultUrl as string | undefined;

    if (resultUrl && resultUrl !== data.resultUrl) {
      const isVideo = sourceNode.type?.includes("video") ||
        sourceNode.type?.includes("Video") ||
        sourceNode.type === "characterSwapNode" ||
        sourceNode.type === "textToVideoNode" ||
        sourceNode.type === "compositeNode";

      updateNodeData(props.id, {
        status: "complete",
        resultUrl,
        resultType: isVideo ? "video" : "image",
      } as Partial<OutputNodeData>);
    }
  }, [props.id, data.resultUrl, getConnectedInputs, updateNodeData, allNodes, edges]);

  const handleDownload = useCallback(async () => {
    if (!data.resultUrl) return;

    try {
      const response = await fetch(data.resultUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ugc-output-${Date.now()}.${data.resultType === "video" ? "mp4" : "png"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      console.error("Download failed");
    }
  }, [data.resultUrl, data.resultType]);

  return (
    <BaseNode
      {...props}
      data={data}
      color="#06b6d4"
      icon={<Download className="w-4 h-4" />}
      inputs={["media"]}
    >
      <div className="space-y-2">
        {data.resultUrl ? (
          <>
            <MediaPreview
              url={data.resultUrl}
              type={data.resultType || "image"}
              compact
            />
            <div className="flex gap-1">
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-md px-2 py-1.5 text-xs text-cyan-400 transition-colors"
              >
                <Download className="w-3 h-3" />
                Download
              </button>
              <button
                onClick={() => setPreview(data.resultUrl!, data.resultType || "image")}
                className="flex items-center justify-center bg-canvas-border/50 hover:bg-canvas-border rounded-md px-2 py-1.5 text-xs text-gray-400 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-gray-500">Connect a processor node</p>
            <p className="text-[10px] text-gray-600 mt-1">Output appears here</p>
          </div>
        )}
      </div>
    </BaseNode>
  );
}
