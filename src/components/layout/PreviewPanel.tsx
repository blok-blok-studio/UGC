"use client";

import { useCallback } from "react";
import { Download, X, Maximize2 } from "lucide-react";
import { useWorkflowStore } from "@/stores/workflow-store";

export default function PreviewPanel() {
  const previewUrl = useWorkflowStore((s) => s.previewUrl);
  const previewType = useWorkflowStore((s) => s.previewType);
  const setPreview = useWorkflowStore((s) => s.setPreview);
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const nodes = useWorkflowStore((s) => s.nodes);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const nodeData = selectedNode?.data as Record<string, unknown> | undefined;
  const nodeResult = nodeData?.resultUrl as string | undefined;

  const displayUrl = previewUrl || nodeResult;
  const displayType = previewType || (nodeResult ? "image" : null);

  const handleDownload = useCallback(async () => {
    if (!displayUrl) return;

    try {
      const response = await fetch(displayUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ugc-${Date.now()}.${displayType === "video" ? "mp4" : "png"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      console.error("Download failed");
    }
  }, [displayUrl, displayType]);

  return (
    <aside className="w-72 bg-canvas-surface border-l border-canvas-border flex flex-col overflow-hidden">
      {/* Title */}
      <div className="px-3 py-3 border-b border-canvas-border flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Preview
        </p>
        {displayUrl && (
          <button
            onClick={() => setPreview(null, null)}
            className="p-1 hover:bg-canvas-border rounded"
          >
            <X className="w-3 h-3 text-gray-500" />
          </button>
        )}
      </div>

      {/* Preview area */}
      <div className="flex-1 p-3">
        {displayUrl ? (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden bg-black/30 group">
              {displayType === "video" ? (
                <video
                  src={displayUrl}
                  className="w-full rounded-lg"
                  controls
                  autoPlay
                  loop
                  playsInline
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayUrl}
                  alt="Preview"
                  className="w-full rounded-lg"
                />
              )}
              <button
                onClick={() => window.open(displayUrl, "_blank")}
                className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Maximize2 className="w-3 h-3 text-white" />
              </button>
            </div>

            {/* Download button */}
            <button
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 bg-accent-primary/20 hover:bg-accent-primary/30 border border-accent-primary/30 rounded-lg px-3 py-2 text-sm text-accent-primary transition-colors"
            >
              <Download className="w-4 h-4" />
              Download {displayType === "video" ? "Video" : "Image"}
            </button>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-canvas-bg border border-canvas-border flex items-center justify-center mb-3">
              <Maximize2 className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-sm text-gray-500">No preview</p>
            <p className="text-xs text-gray-600 mt-1">
              Generate content to see results here
            </p>
          </div>
        )}
      </div>

      {/* Selected node info */}
      {selectedNode && (
        <div className="px-3 py-3 border-t border-canvas-border">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Selected Node
          </p>
          <div className="bg-canvas-bg rounded-lg px-2 py-1.5">
            <p className="text-xs text-gray-300">{nodeData?.label as string}</p>
            <p className="text-[10px] text-gray-600">
              Status: {nodeData?.status as string}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
