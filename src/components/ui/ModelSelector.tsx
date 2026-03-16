"use client";

import { ChevronDown } from "lucide-react";

export interface ModelOption {
  id: string;
  name: string;
  cost: string;
}

interface ModelSelectorProps {
  models: ModelOption[];
  selected: string;
  onChange: (modelId: string) => void;
}

export default function ModelSelector({ models, selected, onChange }: ModelSelectorProps) {
  if (models.length <= 1) return null;

  return (
    <div className="relative">
      <label className="text-[10px] text-gray-500 mb-0.5 block">Model</label>
      <div className="relative">
        <select
          value={selected}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-canvas-bg border border-canvas-border rounded-md px-2 py-1 pr-6 text-[11px] text-gray-300 focus:outline-none focus:border-pink-500/50 cursor-pointer"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.cost})
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
      </div>
    </div>
  );
}
