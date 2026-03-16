"use client";

import { useCallback, useRef, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useWorkflowStore } from "@/stores/workflow-store";
import type { AppNode, AppNodeData } from "@/types";

import ImageNode from "@/components/nodes/ImageNode";
import VideoNode from "@/components/nodes/VideoNode";
import ProductNode from "@/components/nodes/ProductNode";
import PromptNode from "@/components/nodes/PromptNode";
import FaceSwapNode from "@/components/nodes/FaceSwapNode";
import CharacterSwapNode from "@/components/nodes/CharacterSwapNode";
import TextToVideoNode from "@/components/nodes/TextToVideoNode";
import ProductPlacementNode from "@/components/nodes/ProductPlacementNode";
import BackgroundNode from "@/components/nodes/BackgroundNode";
import OutputNode from "@/components/nodes/OutputNode";
import CustomEdge from "./CustomEdge";

const nodeTypes: NodeTypes = {
  imageNode: ImageNode,
  videoNode: VideoNode,
  productNode: ProductNode,
  promptNode: PromptNode,
  faceSwapNode: FaceSwapNode,
  characterSwapNode: CharacterSwapNode,
  textToVideoNode: TextToVideoNode,
  productPlacementNode: ProductPlacementNode,
  backgroundNode: BackgroundNode,
  outputNode: OutputNode,
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DEFAULT_NODE_DATA: Record<string, () => any> = {
  imageNode: () => ({ label: "Image", category: "input", status: "idle" }),
  videoNode: () => ({ label: "Video", category: "input", status: "idle" }),
  productNode: () => ({ label: "Product", category: "input", status: "idle" }),
  promptNode: () => ({
    label: "Prompt",
    category: "input",
    status: "idle",
    prompt: "",
    angle: "front",
    duration: 5,
  }),
  faceSwapNode: () => ({
    label: "Face Swap",
    category: "processor",
    status: "idle",
    preserveHair: "user",
  }),
  characterSwapNode: () => ({
    label: "Character Swap",
    category: "processor",
    status: "idle",
    orientation: "video",
  }),
  textToVideoNode: () => ({
    label: "Text to Video",
    category: "processor",
    status: "idle",
  }),
  productPlacementNode: () => ({
    label: "Product Placement",
    category: "processor",
    status: "idle",
  }),
  backgroundNode: () => ({
    label: "Background",
    category: "processor",
    status: "idle",
  }),
  outputNode: () => ({
    label: "Output",
    category: "output",
    status: "idle",
  }),
};

export default function FlowCanvas() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reactFlowRef = useRef<any>(null);
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode } =
    useWorkflowStore();

  const defaultEdgeOptions = useMemo(
    () => ({
      type: "custom" as const,
      animated: true,
    }),
    []
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData("application/reactflow");
      if (!nodeType || !DEFAULT_NODE_DATA[nodeType]) return;

      const position = reactFlowRef.current?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      }) || { x: 250, y: 250 };

      const newNode: AppNode = {
        id: `${nodeType}-${Date.now()}`,
        type: nodeType,
        position,
        data: DEFAULT_NODE_DATA[nodeType](),
      };

      addNode(newNode);
    },
    [addNode]
  );

  return (
    <div className="w-full h-full touch-none">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={(instance) => {
          reactFlowRef.current = instance;
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        proOptions={{ hideAttribution: true }}
        className="bg-canvas-bg"
        minZoom={0.1}
        maxZoom={4}
        snapToGrid
        snapGrid={[20, 20]}
        zoomOnScroll
        zoomOnPinch
        panOnScroll={false}
        panOnDrag
        selectionOnDrag={false}
        zoomOnDoubleClick
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#1a1a2e"
        />
        <Controls
          className="!bg-canvas-surface !border-canvas-border !rounded-lg !shadow-lg [&>button]:!bg-canvas-surface [&>button]:!border-canvas-border [&>button]:!text-gray-400 [&>button:hover]:!bg-canvas-border"
        />
        <MiniMap
          className="!bg-canvas-surface !border-canvas-border !rounded-lg"
          nodeColor={(node) => {
            const data = node.data as AppNodeData;
            switch (data.category) {
              case "input": return "#3b82f6";
              case "processor": return "#ec4899";
              case "output": return "#06b6d4";
              default: return "#6b7280";
            }
          }}
          maskColor="rgba(10, 10, 15, 0.8)"
        />
      </ReactFlow>
    </div>
  );
}
