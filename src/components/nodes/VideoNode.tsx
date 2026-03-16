"use client";

import { useCallback } from "react";
import { type NodeProps } from "@xyflow/react";
import { Video } from "lucide-react";
import BaseNode from "./BaseNode";
import DropZone from "@/components/ui/DropZone";
import MediaPreview from "@/components/ui/MediaPreview";
import { useWorkflowStore } from "@/stores/workflow-store";
import { uploadFile } from "@/lib/upload";
import { needsTranscode, transcodeToWebM } from "@/lib/transcode";
import type { VideoNodeData } from "@/types";

export default function VideoNode(props: NodeProps) {
  const data = props.data as unknown as VideoNodeData;
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);

  const handleFile = useCallback(
    async (file: File) => {
      try {
        let uploadableFile = file;

        // Transcode HEVC/iPhone videos to WebM for fal.ai compatibility
        if (await needsTranscode(file)) {
          updateNodeData(props.id, { status: "processing", error: undefined } as Partial<VideoNodeData>);
          uploadableFile = await transcodeToWebM(file, (pct) => {
            updateNodeData(props.id, { progressText: `Converting: ${pct}%` } as Partial<VideoNodeData>);
          });
        }

        updateNodeData(props.id, { status: "uploading" } as Partial<VideoNodeData>);

        // Upload via presigned URL (bypasses Vercel 4.5MB body limit)
        const url = await uploadFile(uploadableFile);

        updateNodeData(props.id, {
          status: "complete",
          fileUrl: url,
          fileName: file.name,
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
