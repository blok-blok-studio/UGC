"use client";

import { ReactFlowProvider } from "@xyflow/react";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import PreviewPanel from "@/components/layout/PreviewPanel";
import FlowCanvas from "@/components/canvas/FlowCanvas";
import { useWorkflowStore } from "@/stores/workflow-store";

function StatusBar() {
  const isGenerating = useWorkflowStore((s) => s.isGenerating);
  const generationProgress = useWorkflowStore((s) => s.generationProgress);
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);

  return (
    <div className="h-7 bg-canvas-surface border-t border-canvas-border flex items-center px-4 text-[10px] text-gray-600 gap-4">
      <span>
        {nodes.length} node{nodes.length !== 1 ? "s" : ""} | {edges.length} connection{edges.length !== 1 ? "s" : ""}
      </span>
      {isGenerating && (
        <span className="text-accent-primary flex items-center gap-1">
          <span className="w-1 h-1 bg-accent-primary rounded-full animate-pulse" />
          {generationProgress || "Processing..."}
        </span>
      )}
      <span className="ml-auto">fal.ai powered</span>
    </div>
  );
}

export default function Home() {
  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <main className="flex-1 relative">
            <FlowCanvas />
          </main>
          <PreviewPanel />
        </div>
        <StatusBar />
      </div>
    </ReactFlowProvider>
  );
}
