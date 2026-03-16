"use client";

import { useCallback } from "react";
import { type NodeProps } from "@xyflow/react";
import { Users, Play } from "lucide-react";
import BaseNode from "./BaseNode";
import MediaPreview from "@/components/ui/MediaPreview";
import ProgressBar from "@/components/ui/ProgressBar";
import { useWorkflowStore } from "@/stores/workflow-store";
import { generate } from "@/lib/generate";
import type { FaceSwapNodeData } from "@/types";

export default function FaceSwapNode(props: NodeProps) {
  const data = props.data as unknown as FaceSwapNodeData;
  const { updateNodeData, getConnectedInputs, setPreview } = useWorkflowStore();

  const handleGenerate = useCallback(async () => {
    const inputs = getConnectedInputs(props.id);
    const sourceNode = inputs["source_face"] || Object.values(inputs)[0];
    const targetNode = inputs["target_image"] || Object.values(inputs)[1];

    if (!sourceNode?.data || !targetNode?.data) {
      updateNodeData(props.id, {
        status: "error",
        error: "Connect a source face and target image",
      } as Partial<FaceSwapNodeData>);
      return;
    }

    const sourceData = sourceNode.data as Record<string, unknown>;
    const targetData = targetNode.data as Record<string, unknown>;
    const sourceUrl = sourceData.fileUrl as string | undefined;
    const targetUrl = targetData.fileUrl as string | undefined;

    if (!sourceUrl || !targetUrl) {
      updateNodeData(props.id, {
        status: "error",
        error: "Both inputs need uploaded files",
      } as Partial<FaceSwapNodeData>);
      return;
    }

    updateNodeData(props.id, { status: "processing", error: undefined } as Partial<FaceSwapNodeData>);

    try {
      const result = await generate(
        "easel-ai/advanced-face-swap",
        {
          face_image_0: sourceUrl,
          target_image: targetUrl,
          workflow_type: data.preserveHair === "target" ? "target_hair" : "user_hair",
        },
        props.id,
      );

      updateNodeData(props.id, {
        status: "complete",
        resultUrl: result.resultUrl,
      } as Partial<FaceSwapNodeData>);
      setPreview(result.resultUrl, result.resultType);
    } catch (err) {
      updateNodeData(props.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Generation failed",
      } as Partial<FaceSwapNodeData>);
    }
  }, [props.id, data.preserveHair, updateNodeData, getConnectedInputs, setPreview]);

  return (
    <BaseNode
      {...props}
      data={data}
      color="#ec4899"
      icon={<Users className="w-4 h-4" />}
      inputs={["source_face", "target_image"]}
      outputs={["image"]}
    >
      <div className="space-y-2">
        {/* Hair preservation toggle */}
        <div className="flex gap-1">
          {(["user_hair", "target_hair"] as const).map((option) => (
            <button
              key={option}
              onClick={() => updateNodeData(props.id, { preserveHair: option === "user_hair" ? "user" : "target" } as Partial<FaceSwapNodeData>)}
              className={`text-[10px] px-2 py-0.5 rounded border flex-1 ${
                (data.preserveHair || "user") === (option === "user_hair" ? "user" : "target")
                  ? "bg-pink-500/20 border-pink-500/50 text-pink-400"
                  : "border-canvas-border text-gray-500"
              }`}
            >
              {option === "user_hair" ? "Keep My Hair" : "Keep Target Hair"}
            </button>
          ))}
        </div>

        {/* Generate button */}
        {data.status !== "processing" && (
          <button
            onClick={handleGenerate}
            className="w-full flex items-center justify-center gap-1.5 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 rounded-md px-3 py-1.5 text-xs text-pink-400 transition-colors"
          >
            <Play className="w-3 h-3" />
            Generate Face Swap
          </button>
        )}

        {data.status === "processing" && <ProgressBar label="Swapping face..." />}

        {data.resultUrl && (
          <MediaPreview url={data.resultUrl} type="image" compact />
        )}
      </div>
    </BaseNode>
  );
}
