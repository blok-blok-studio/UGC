"use client";

import { useCallback } from "react";
import { type NodeProps } from "@xyflow/react";
import { Music } from "lucide-react";
import BaseNode from "./BaseNode";
import DropZone from "@/components/ui/DropZone";
import { useWorkflowStore } from "@/stores/workflow-store";
import { uploadFile } from "@/lib/upload";
import type { AudioNodeData } from "@/types";

export default function AudioNode(props: NodeProps) {
  const data = props.data as unknown as AudioNodeData;
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);

  const handleFile = useCallback(
    async (file: File) => {
      updateNodeData(props.id, { status: "uploading" } as Partial<AudioNodeData>);

      try {
        const url = await uploadFile(file);

        updateNodeData(props.id, {
          status: "complete",
          fileUrl: url,
          fileName: file.name,
        } as Partial<AudioNodeData>);
      } catch (err) {
        updateNodeData(props.id, {
          status: "error",
          error: err instanceof Error ? err.message : "Upload failed",
        } as Partial<AudioNodeData>);
      }
    },
    [props.id, updateNodeData]
  );

  const handleRemove = useCallback(() => {
    updateNodeData(props.id, {
      status: "idle",
      fileUrl: undefined,
      fileName: undefined,
    } as Partial<AudioNodeData>);
  }, [props.id, updateNodeData]);

  return (
    <BaseNode
      {...props}
      data={data}
      color="#f97316"
      icon={<Music className="w-4 h-4" />}
      outputs={["audio"]}
    >
      {data.fileUrl ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2 bg-canvas-bg rounded-md px-2 py-2">
            <Music className="w-4 h-4 text-orange-400 flex-shrink-0" />
            <span className="text-xs text-gray-300 truncate flex-1">{data.fileName}</span>
            <button
              onClick={handleRemove}
              className="text-[10px] text-gray-500 hover:text-red-400"
            >
              Remove
            </button>
          </div>
          <audio src={data.fileUrl} controls className="w-full h-8" />
        </div>
      ) : (
        <DropZone accept="audio" onFile={handleFile} compact disabled={data.status === "uploading"} />
      )}
    </BaseNode>
  );
}
