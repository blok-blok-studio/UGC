"use client";

import { useCallback } from "react";
import { type NodeProps } from "@xyflow/react";
import { Video } from "lucide-react";
import BaseNode from "./BaseNode";
import DropZone from "@/components/ui/DropZone";
import MediaPreview from "@/components/ui/MediaPreview";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { VideoNodeData } from "@/types";

export default function VideoNode(props: NodeProps) {
  const data = props.data as unknown as VideoNodeData;
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);

  const handleFile = useCallback(
    async (file: File) => {
      updateNodeData(props.id, { status: "uploading" } as Partial<VideoNodeData>);

      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Upload failed");
        }

        const { url, fileName } = await res.json();
        updateNodeData(props.id, {
          status: "complete",
          fileUrl: url,
          fileName,
          thumbnailUrl: URL.createObjectURL(file),
        } as Partial<VideoNodeData>);
      } catch (err) {
        updateNodeData(props.id, {
          status: "error",
          error: err instanceof Error ? err.message : "Upload failed",
        } as Partial<VideoNodeData>);
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
    } as Partial<VideoNodeData>);
  }, [props.id, updateNodeData]);

  return (
    <BaseNode
      {...props}
      data={data}
      color="#8b5cf6"
      icon={<Video className="w-4 h-4" />}
      outputs={["video"]}
    >
      {data.thumbnailUrl ? (
        <div>
          <MediaPreview url={data.thumbnailUrl} type="video" compact onRemove={handleRemove} />
          <p className="text-xs text-gray-500 mt-1 truncate">{data.fileName}</p>
        </div>
      ) : (
        <DropZone accept="video" onFile={handleFile} compact disabled={data.status === "uploading"} />
      )}
    </BaseNode>
  );
}
