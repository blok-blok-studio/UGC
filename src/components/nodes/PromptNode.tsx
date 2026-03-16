"use client";

import { useCallback } from "react";
import { type NodeProps } from "@xyflow/react";
import { Type } from "lucide-react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { PromptNodeData } from "@/types";

const ANGLES = [
  { value: "front", label: "Front" },
  { value: "side", label: "Side" },
  { value: "three-quarter", label: "3/4 View" },
  { value: "overhead", label: "Overhead" },
  { value: "low-angle", label: "Low Angle" },
] as const;

export default function PromptNode(props: NodeProps) {
  const data = props.data as unknown as PromptNodeData;
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);

  const handleChange = useCallback(
    (field: string, value: string | number) => {
      updateNodeData(props.id, { [field]: value } as Partial<PromptNodeData>);
    },
    [props.id, updateNodeData]
  );

  return (
    <BaseNode
      {...props}
      data={data}
      color="#10b981"
      icon={<Type className="w-4 h-4" />}
      outputs={["prompt"]}
    >
      <div className="space-y-2">
        <textarea
          value={data.prompt || ""}
          onChange={(e) => handleChange("prompt", e.target.value)}
          placeholder="Describe your UGC content..."
          className="w-full bg-canvas-bg border border-canvas-border rounded-md px-2 py-1.5 text-xs text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-accent-primary/50"
          rows={3}
        />

        {/* Camera Angle */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider">Angle</label>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {ANGLES.map((angle) => (
              <button
                key={angle.value}
                onClick={() => handleChange("angle", angle.value)}
                className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                  data.angle === angle.value
                    ? "bg-accent-success/20 border-accent-success/50 text-accent-success"
                    : "border-canvas-border text-gray-500 hover:text-gray-300"
                }`}
              >
                {angle.label}
              </button>
            ))}
          </div>
        </div>

        {/* Background */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider">Background</label>
          <input
            type="text"
            value={data.background || ""}
            onChange={(e) => handleChange("background", e.target.value)}
            placeholder="e.g., modern kitchen, beach..."
            className="w-full bg-canvas-bg border border-canvas-border rounded-md px-2 py-1 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent-primary/50 mt-0.5"
          />
        </div>

        {/* Style */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider">Style</label>
          <input
            type="text"
            value={data.style || ""}
            onChange={(e) => handleChange("style", e.target.value)}
            placeholder="e.g., cinematic, natural, vibrant..."
            className="w-full bg-canvas-bg border border-canvas-border rounded-md px-2 py-1 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent-primary/50 mt-0.5"
          />
        </div>

        {/* Duration */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider">
            Duration: {data.duration || 5}s
          </label>
          <input
            type="range"
            min={2}
            max={10}
            value={data.duration || 5}
            onChange={(e) => handleChange("duration", parseInt(e.target.value))}
            className="w-full h-1 accent-accent-success"
          />
        </div>
      </div>
    </BaseNode>
  );
}
