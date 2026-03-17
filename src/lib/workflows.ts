import type { AppNode } from "@/types";
import type { Edge } from "@xyflow/react";

interface WorkflowTemplate {
  label: string;
  description: string;
  nodes: AppNode[];
  edges: Edge[];
}

const ts = () => Date.now() + Math.random().toString(36).slice(2, 6);

export function getWorkflowTemplates(): WorkflowTemplate[] {
  return [
    {
      label: "Product Hold",
      description: "Image + Product → Video",
      nodes: [
        {
          id: `imageNode-${ts()}`,
          type: "imageNode",
          position: { x: 50, y: 100 },
          data: { label: "Your Image", category: "input", status: "idle" } as never,
        },
        {
          id: `productNode-${ts()}`,
          type: "productNode",
          position: { x: 50, y: 350 },
          data: { label: "Product", category: "input", status: "idle" } as never,
        },
        {
          id: `productPlacementNode-${ts()}`,
          type: "productPlacementNode",
          position: { x: 400, y: 200 },
          data: { label: "Product Placement", category: "processor", status: "idle" } as never,
        },
        {
          id: `outputNode-${ts()}`,
          type: "outputNode",
          position: { x: 750, y: 200 },
          data: { label: "Output", category: "output", status: "idle" } as never,
        },
      ],
      edges: [],
    },
    {
      label: "Character Swap",
      description: "Video + Character → Your Background",
      nodes: [
        {
          id: `videoNode-${ts()}`,
          type: "videoNode",
          position: { x: 50, y: 50 },
          data: { label: "Your Video", category: "input", status: "idle" } as never,
        },
        {
          id: `imageNode-${ts()}`,
          type: "imageNode",
          position: { x: 50, y: 350 },
          data: { label: "Character Image", category: "input", status: "idle" } as never,
        },
        {
          id: `characterSwapNode-${ts()}`,
          type: "characterSwapNode",
          position: { x: 400, y: 150 },
          data: { label: "Character Swap", category: "processor", status: "idle", orientation: "video" } as never,
        },
        {
          id: `outputNode-${ts()}`,
          type: "outputNode",
          position: { x: 750, y: 150 },
          data: { label: "Output", category: "output", status: "idle" } as never,
        },
      ],
      edges: [],
    },
    {
      label: "Text to UGC",
      description: "Prompt + Images → Video",
      nodes: [
        {
          id: `imageNode-1-${ts()}`,
          type: "imageNode",
          position: { x: 50, y: 50 },
          data: { label: "Reference 1 (You)", category: "input", status: "idle" } as never,
        },
        {
          id: `imageNode-2-${ts()}`,
          type: "imageNode",
          position: { x: 50, y: 250 },
          data: { label: "Reference 2 (Style)", category: "input", status: "idle" } as never,
        },
        {
          id: `promptNode-${ts()}`,
          type: "promptNode",
          position: { x: 50, y: 450 },
          data: { label: "Prompt", category: "input", status: "idle", prompt: "", angle: "front", duration: 5 } as never,
        },
        {
          id: `textToVideoNode-${ts()}`,
          type: "textToVideoNode",
          position: { x: 450, y: 200 },
          data: { label: "Text to Video", category: "processor", status: "idle" } as never,
        },
        {
          id: `outputNode-${ts()}`,
          type: "outputNode",
          position: { x: 800, y: 200 },
          data: { label: "Output", category: "output", status: "idle" } as never,
        },
      ],
      edges: [],
    },
  ];
}

// Edge wiring definitions for each workflow template.
// Maps: [sourceNodeIndex, sourceHandle, targetNodeIndex, targetHandle]
// Uses node index (position in the nodes array) to support duplicate node types.
const WORKFLOW_EDGES: Record<string, [number, string, number, string][]> = {
  "Product Hold": [
    [0, "image", 2, "person_image"],   // Image → ProductPlacement
    [1, "image", 2, "product_image"],   // Product → ProductPlacement
    [2, "image", 3, "media"],           // ProductPlacement → Output
  ],
  "Character Swap": [
    [0, "video", 2, "reference_video"], // Video → CharacterSwap
    [1, "image", 2, "character_image"], // Image → CharacterSwap
    [2, "video", 3, "media"],           // CharacterSwap → Output
  ],
  "Text to UGC": [
    [0, "image", 3, "reference_image_1"], // Image 1 → TextToVideo
    [1, "image", 3, "reference_image_2"], // Image 2 → TextToVideo
    [2, "prompt", 3, "prompt"],            // Prompt → TextToVideo
    [3, "video", 4, "media"],              // TextToVideo → Output
  ],
};

export function createWorkflow(template: WorkflowTemplate): { nodes: AppNode[]; edges: Edge[] } {
  const now = Date.now();

  const nodes = template.nodes.map((node, i) => ({
    ...node,
    id: `${node.type}-${now + i}`,
  }));

  const wiring = WORKFLOW_EDGES[template.label] || [];
  const edges: Edge[] = wiring.map(([srcIdx, srcHandle, tgtIdx, tgtHandle]) => ({
    id: `e-${nodes[srcIdx].id}-${srcHandle}-${nodes[tgtIdx].id}-${tgtHandle}`,
    source: nodes[srcIdx].id,
    sourceHandle: srcHandle,
    target: nodes[tgtIdx].id,
    targetHandle: tgtHandle,
    animated: false,
    type: "custom",
    style: { stroke: "#6366f1", strokeWidth: 2 },
  }));

  return { nodes, edges };
}
