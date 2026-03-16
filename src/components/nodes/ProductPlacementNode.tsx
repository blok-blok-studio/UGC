"use client";

import { useCallback } from "react";
import { type NodeProps } from "@xyflow/react";
import { Hand, Play } from "lucide-react";
import BaseNode from "./BaseNode";
import MediaPreview from "@/components/ui/MediaPreview";
import ProgressBar from "@/components/ui/ProgressBar";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { ProductPlacementNodeData } from "@/types";

export default function ProductPlacementNode(props: NodeProps) {
  const data = props.data as unknown as ProductPlacementNodeData;
  const { updateNodeData, getConnectedInputs, setPreview } = useWorkflowStore();

  const handleGenerate = useCallback(async () => {
    const inputs = getConnectedInputs(props.id);

    const personNode = Object.values(inputs).find(
      (n) => n.type === "imageNode"
    );
    const productNode = Object.values(inputs).find(
      (n) => n.type === "productNode"
    );

    const personData = personNode?.data as Record<string, unknown> | undefined;
    const productData = productNode?.data as Record<string, unknown> | undefined;
    const personUrl = personData?.fileUrl as string | undefined;
    const productUrl = productData?.fileUrl as string | undefined;

    if (!personUrl || !productUrl) {
      updateNodeData(props.id, {
        status: "error",
        error: "Connect a person image and product image",
      } as Partial<ProductPlacementNodeData>);
      return;
    }

    updateNodeData(props.id, { status: "processing", error: undefined } as Partial<ProductPlacementNodeData>);

    try {
      // Use image generation with a product placement prompt
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: "fal-ai/flux/schnell",
          inputs: {
            prompt: `A person naturally holding a product in their hands, professional UGC style photography, natural lighting, social media ready`,
            image_url: personUrl,
            num_images: 1,
          },
          nodeId: props.id,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Generation failed");
      }

      const result = await res.json();
      updateNodeData(props.id, {
        status: "complete",
        resultUrl: result.resultUrl,
      } as Partial<ProductPlacementNodeData>);
      setPreview(result.resultUrl, "image");
    } catch (err) {
      updateNodeData(props.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Generation failed",
      } as Partial<ProductPlacementNodeData>);
    }
  }, [props.id, updateNodeData, getConnectedInputs, setPreview]);

  return (
    <BaseNode
      {...props}
      data={data}
      color="#ec4899"
      icon={<Hand className="w-4 h-4" />}
      inputs={["person_image", "product_image"]}
      outputs={["image"]}
    >
      <div className="space-y-2">
        <p className="text-[10px] text-gray-500">
          Person + Product → Holding product
        </p>

        {data.status !== "processing" && (
          <button
            onClick={handleGenerate}
            className="w-full flex items-center justify-center gap-1.5 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 rounded-md px-3 py-1.5 text-xs text-pink-400 transition-colors"
          >
            <Play className="w-3 h-3" />
            Place Product
          </button>
        )}

        {data.status === "processing" && <ProgressBar label="Placing product..." />}

        {data.resultUrl && (
          <MediaPreview url={data.resultUrl} type="image" compact />
        )}
      </div>
    </BaseNode>
  );
}
