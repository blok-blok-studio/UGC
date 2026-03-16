import { create } from "zustand";
import {
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Connection,
} from "@xyflow/react";
import type { AppNode, AppNodeData, GenerationResult } from "@/types";

interface WorkflowState {
  // Flow state
  nodes: AppNode[];
  edges: Edge[];
  selectedNodeId: string | null;

  // Generation state
  isGenerating: boolean;
  generationProgress: string;

  // Preview state
  previewUrl: string | null;
  previewType: "image" | "video" | null;

  // Actions
  onNodesChange: OnNodesChange<AppNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (node: AppNode) => void;
  removeNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<AppNodeData>) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setGenerating: (generating: boolean, progress?: string) => void;
  setPreview: (url: string | null, type: "image" | "video" | null) => void;
  applyGenerationResult: (result: GenerationResult) => void;
  getConnectedInputs: (nodeId: string) => Record<string, AppNode>;
  clearCanvas: () => void;
  loadWorkflow: (nodes: AppNode[], edges: Edge[]) => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  isGenerating: false,
  generationProgress: "",
  previewUrl: null,
  previewType: null,

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection: Connection) => {
    const edge = {
      ...connection,
      animated: true,
      style: { stroke: "#6366f1", strokeWidth: 2 },
    };
    set({ edges: addEdge(edge, get().edges) });
  },

  addNode: (node) => {
    set({ nodes: [...get().nodes, node] });
  },

  removeNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      ),
      selectedNodeId:
        get().selectedNodeId === nodeId ? null : get().selectedNodeId,
    });
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } as AppNodeData }
          : node
      ),
    });
  },

  setSelectedNode: (nodeId) => {
    set({ selectedNodeId: nodeId });
  },

  setGenerating: (generating, progress = "") => {
    set({ isGenerating: generating, generationProgress: progress });
  },

  setPreview: (url, type) => {
    set({ previewUrl: url, previewType: type });
  },

  applyGenerationResult: (result) => {
    const { nodeId, resultUrl, resultType } = result;
    get().updateNodeData(nodeId, {
      status: "complete",
      resultUrl,
    } as Partial<AppNodeData>);
    set({ previewUrl: resultUrl, previewType: resultType });
  },

  getConnectedInputs: (nodeId) => {
    const { edges, nodes } = get();
    const inputEdges = edges.filter((e) => e.target === nodeId);
    const inputs: Record<string, AppNode> = {};
    for (const edge of inputEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (sourceNode) {
        const handleId = edge.targetHandle || edge.sourceHandle || "default";
        inputs[handleId] = sourceNode;
      }
    }
    return inputs;
  },

  clearCanvas: () => {
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      previewUrl: null,
      previewType: null,
    });
  },

  loadWorkflow: (nodes, edges) => {
    set({
      nodes,
      edges,
      selectedNodeId: null,
      previewUrl: null,
      previewType: null,
    });
  },
}));
