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
      description: "Prompt → Video",
      nodes: [
        {
          id: `promptNode-${ts()}`,
          type: "promptNode",
          position: { x: 50, y: 100 },
          data: { label: "Prompt", category: "input", status: "idle", prompt: "", angle: "front", duration: 5 } as never,
        },
        {
          id: `textToVideoNode-${ts()}`,
          type: "textToVideoNode",
          position: { x: 400, y: 100 },
          data: { label: "Text to Video", category: "processor", status: "idle" } as never,
        },
        {
          id: `outputNode-${ts()}`,
          type: "outputNode",
          position: { x: 750, y: 100 },
          data: { label: "Output", category: "output", status: "idle" } as never,
        },
      ],
      edges: [],
    },
  ];
}

// Edge wiring definitions for each workflow template.
// Maps: [sourceNodeType, sourceHandle, targetNodeType, targetHandle]
const WORKFLOW_WIRING: Record<string, [string, string, string, string][]> = {
  "Product Hold": [
    ["imageNode", "image", "productPlacementNode", "person_image"],
    ["productNode", "image", "productPlacementNode", "product_image"],
    ["productPlacementNode", "image", "outputNode", "media"],
  ],
  "Character Swap": [
    ["videoNode", "video", "characterSwapNode", "reference_video"],
    ["imageNode", "image", "characterSwapNode", "character_image"],
    ["characterSwapNode", "video", "outputNode", "media"],
  ],
  "Text to UGC": [
    ["promptNode", "prompt", "textToVideoNode", "prompt"],
    ["textToVideoNode", "video", "outputNode", "media"],
  ],
};

export function createWorkflow(template: WorkflowTemplate): { nodes: AppNode[]; edges: Edge[] } {
  // Generate fresh IDs to avoid conflicts
  const idMap: Record<string, string> = {};
  const now = Date.now();

  const nodes = template.nodes.map((node, i) => {
    const newId = `${node.type}-${now + i}`;
    idMap[node.id] = newId;
    return { ...node, id: newId };
  });

  // Build a lookup: nodeType → newId
  // For Character Swap workflow, videoNode appears once but connects to two targets
  const typeToId: Record<string, string> = {};
  for (const node of nodes) {
    typeToId[node.type!] = node.id;
  }

  const wiring = WORKFLOW_WIRING[template.label] || [];
  const edges: Edge[] = wiring.map(([srcType, srcHandle, tgtType, tgtHandle]) => ({
    id: `e-${typeToId[srcType]}-${srcHandle}-${typeToId[tgtType]}-${tgtHandle}`,
    source: typeToId[srcType],
    sourceHandle: srcHandle,
    target: typeToId[tgtType],
    targetHandle: tgtHandle,
    animated: false,
    type: "custom",
    style: { stroke: "#6366f1", strokeWidth: 2 },
  }));

  return { nodes, edges };
}
