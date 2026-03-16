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
      description: "Video + Character → Video",
      nodes: [
        {
          id: `videoNode-${ts()}`,
          type: "videoNode",
          position: { x: 50, y: 100 },
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
          position: { x: 400, y: 200 },
          data: { label: "Character Swap", category: "processor", status: "idle", orientation: "video" } as never,
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

export function createWorkflow(template: WorkflowTemplate): { nodes: AppNode[]; edges: Edge[] } {
  // Generate fresh IDs to avoid conflicts
  const idMap: Record<string, string> = {};
  const now = Date.now();

  const nodes = template.nodes.map((node, i) => {
    const newId = `${node.type}-${now + i}`;
    idMap[node.id] = newId;
    return { ...node, id: newId };
  });

  // Auto-wire edges: connect outputs of input nodes to inputs of processor nodes,
  // and outputs of processor nodes to output nodes
  const edges: Edge[] = [];
  const inputNodes = nodes.filter((n) => (n.data as Record<string, unknown>).category === "input");
  const processorNodes = nodes.filter((n) => (n.data as Record<string, unknown>).category === "processor");
  const outputNodes = nodes.filter((n) => (n.data as Record<string, unknown>).category === "output");

  // Connect input → processor
  for (const input of inputNodes) {
    for (const proc of processorNodes) {
      edges.push({
        id: `e-${input.id}-${proc.id}`,
        source: input.id,
        target: proc.id,
        animated: true,
        type: "custom",
        style: { stroke: "#6366f1", strokeWidth: 2 },
      });
    }
  }

  // Connect processor → output
  for (const proc of processorNodes) {
    for (const out of outputNodes) {
      edges.push({
        id: `e-${proc.id}-${out.id}`,
        source: proc.id,
        target: out.id,
        animated: true,
        type: "custom",
        style: { stroke: "#6366f1", strokeWidth: 2 },
      });
    }
  }

  return { nodes, edges };
}
