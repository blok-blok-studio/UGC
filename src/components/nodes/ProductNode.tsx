"use client";

import { useCallback } from "react";
import { type NodeProps } from "@xyflow/react";
import { Package } from "lucide-react";
import BaseNode from "./BaseNode";
import DropZone from "@/components/ui/DropZone";
import MediaPreview from "@/components/ui/MediaPreview";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { ProductNodeData } from "@/types";

export default function ProductNode(props: NodeProps) {
  const data = props.data as unknown as ProductNodeData;
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);

  const handleFile = useCallback(
    async (file: File) => {
      updateNodeData(props.id, { status: "uploading" } as Partial<ProductNodeData>);

      try {
        // First upload the file
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });

        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || "Upload failed");
        }

        const { url, fileName } = await uploadRes.json();

        // Auto-remove background for product images
        updateNodeData(props.id, { status: "processing" } as Partial<ProductNodeData>);

        const bgRemoveRes = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelId: "fal-ai/bria/rmbg/v2",
            inputs: { image_url: url },
            nodeId: props.id,
          }),
        });

        if (bgRemoveRes.ok) {
          const result = await bgRemoveRes.json();
          updateNodeData(props.id, {
            status: "complete",
            fileUrl: result.resultUrl,
            fileName,
            thumbnailUrl: result.resultUrl,
            backgroundRemoved: true,
          } as Partial<ProductNodeData>);
        } else {
          // Fallback to original image if bg removal fails
          updateNodeData(props.id, {
            status: "complete",
            fileUrl: url,
            fileName,
            thumbnailUrl: URL.createObjectURL(file),
            backgroundRemoved: false,
          } as Partial<ProductNodeData>);
        }
      } catch (err) {
        updateNodeData(props.id, {
          status: "error",
          error: err instanceof Error ? err.message : "Upload failed",
        } as Partial<ProductNodeData>);
      }
    },
    [props.id, updateNodeData]
  );

  const handleRemove = useCallback(() => {
    updateNodeData(props.id, {
      status: "idle",
      fileUrl: undefined,
      fileName: undefined,
      thumbnailUrl: undefined,
      backgroundRemoved: false,
    } as Partial<ProductNodeData>);
  }, [props.id, updateNodeData]);

  return (
    <BaseNode
      {...props}
      data={data}
      color="#f59e0b"
      icon={<Package className="w-4 h-4" />}
      outputs={["image"]}
    >
      {data.thumbnailUrl ? (
        <div>
          <MediaPreview url={data.thumbnailUrl} type="image" compact onRemove={handleRemove} />
          <div className="flex items-center gap-1 mt-1">
            <p className="text-xs text-gray-500 truncate flex-1">{data.fileName}</p>
            {data.backgroundRemoved && (
              <span className="text-[10px] bg-accent-success/20 text-accent-success px-1.5 py-0.5 rounded">
                BG removed
              </span>
            )}
          </div>
        </div>
      ) : (
        <DropZone accept="image" onFile={handleFile} compact disabled={data.status === "uploading" || data.status === "processing"} />
      )}
    </BaseNode>
  );
}
