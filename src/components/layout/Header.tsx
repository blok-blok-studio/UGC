"use client";

import { Sparkles, Trash2, Settings } from "lucide-react";
import { useWorkflowStore } from "@/stores/workflow-store";

export default function Header() {
  const clearCanvas = useWorkflowStore((s) => s.clearCanvas);
  const isGenerating = useWorkflowStore((s) => s.isGenerating);

  return (
    <header className="h-12 bg-canvas-surface border-b border-canvas-border flex items-center justify-between px-4">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-accent-primary/20 rounded-lg">
          <Sparkles className="w-4 h-4 text-accent-primary" />
        </div>
        <h1 className="text-sm font-semibold text-gray-200">UGC Studio</h1>
        <span className="text-[10px] bg-accent-primary/20 text-accent-primary px-1.5 py-0.5 rounded-full font-medium">
          BETA
        </span>
      </div>

      {/* Status */}
      <div className="flex items-center gap-3">
        {isGenerating && (
          <span className="text-xs text-accent-primary flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-pulse" />
            Generating...
          </span>
        )}

        <button
          onClick={clearCanvas}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded hover:bg-canvas-border/50"
          title="Clear canvas"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </button>

        <button
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded hover:bg-canvas-border/50"
          title="Settings"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
