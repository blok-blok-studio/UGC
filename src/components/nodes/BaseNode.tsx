"use client";

import { type ReactNode } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Loader2, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { BaseNodeData, NodeCategory } from "@/types";

const CATEGORY_STYLES: Record<NodeCategory, string> = {
  input: "border-blue-500/30 shadow-blue-500/10",
  processor: "border-pink-500/30 shadow-pink-500/10",
  output: "border-cyan-500/30 shadow-cyan-500/10",
};

interface BaseNodeProps extends Omit<NodeProps, "data"> {
  data: BaseNodeData;
  color: string;
  icon: ReactNode;
  inputs?: string[];
  outputs?: string[];
  children: ReactNode;
}

export default function BaseNode({
  id,
  data,
  color,
  icon,
  inputs = [],
  outputs = [],
  children,
  selected,
}: BaseNodeProps) {
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const setSelectedNode = useWorkflowStore((s) => s.setSelectedNode);

  return (
    <div
      className={`
        bg-canvas-surface border rounded-xl shadow-lg min-w-[200px] max-w-[260px]
        transition-all duration-200
        ${CATEGORY_STYLES[data.category]}
        ${selected ? "ring-2 ring-accent-primary border-accent-primary/50" : ""}
      `}
      onClick={() => setSelectedNode(id)}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b border-canvas-border rounded-t-xl"
        style={{ backgroundColor: `${color}15` }}
      >
        <div className="p-1 rounded-md" style={{ backgroundColor: `${color}25` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <span className="text-sm font-medium text-gray-200 flex-1 truncate">
          {data.label}
        </span>
        {/* Status indicator */}
        {data.status === "processing" && (
          <Loader2 className="w-3.5 h-3.5 text-accent-primary animate-spin" />
        )}
        {data.status === "complete" && (
          <CheckCircle2 className="w-3.5 h-3.5 text-accent-success" />
        )}
        {data.status === "error" && (
          <AlertCircle className="w-3.5 h-3.5 text-accent-error" />
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeNode(id);
          }}
          className="p-1 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="w-3 h-3 text-gray-500 hover:text-red-400" />
        </button>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {children}
        {data.error && (
          <p className="text-xs text-accent-error bg-accent-error/10 rounded px-2 py-1">
            {data.error}
          </p>
        )}
      </div>

      {/* Input handles */}
      {inputs.map((input, i) => (
        <Handle
          key={`input-${input}`}
          type="target"
          position={Position.Left}
          id={input}
          className="!w-3 !h-3 !bg-canvas-border !border-2 hover:!bg-accent-primary transition-colors"
          style={{
            top: `${((i + 1) / (inputs.length + 1)) * 100}%`,
            borderColor: color,
          }}
        />
      ))}

      {/* Output handles */}
      {outputs.map((output, i) => (
        <Handle
          key={`output-${output}`}
          type="source"
          position={Position.Right}
          id={output}
          className="!w-3 !h-3 !bg-canvas-border !border-2 hover:!bg-accent-primary transition-colors"
          style={{
            top: `${((i + 1) / (outputs.length + 1)) * 100}%`,
            borderColor: color,
          }}
        />
      ))}
    </div>
  );
}
