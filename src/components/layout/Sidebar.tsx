"use client";

import { useState } from "react";
import {
  Image,
  Video,
  Package,
  Type,
  Users,
  PersonStanding,
  Wand2,
  Hand,
  Layers,
  Download,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { NODE_PALETTE } from "@/lib/models";
import { getWorkflowTemplates, createWorkflow } from "@/lib/workflows";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { NodeCategory, PaletteItem } from "@/types";

const ICON_MAP: Record<string, React.ReactNode> = {
  Image: <Image className="w-4 h-4" />,
  Video: <Video className="w-4 h-4" />,
  Package: <Package className="w-4 h-4" />,
  Type: <Type className="w-4 h-4" />,
  Users: <Users className="w-4 h-4" />,
  PersonStanding: <PersonStanding className="w-4 h-4" />,
  Wand2: <Wand2 className="w-4 h-4" />,
  Hand: <Hand className="w-4 h-4" />,
  Layers: <Layers className="w-4 h-4" />,
  Download: <Download className="w-4 h-4" />,
};

const CATEGORY_LABELS: Record<NodeCategory, string> = {
  input: "Inputs",
  processor: "AI Processors",
  output: "Output",
};

const CATEGORY_ORDER: NodeCategory[] = ["input", "processor", "output"];

function NodePaletteItem({ item }: { item: PaletteItem }) {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData("application/reactflow", item.type);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-2.5 px-2 py-2 rounded-lg border border-transparent hover:border-canvas-border hover:bg-canvas-bg cursor-grab active:cursor-grabbing transition-all group"
    >
      <div
        className="p-1.5 rounded-md shrink-0"
        style={{ backgroundColor: `${item.color}20` }}
      >
        <span style={{ color: item.color }}>{ICON_MAP[item.icon]}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-300 group-hover:text-gray-100">
          {item.label}
        </p>
        <p className="text-[10px] text-gray-600 truncate">
          {item.description}
        </p>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow);
  const [expandedCategories, setExpandedCategories] = useState<Set<NodeCategory>>(
    new Set(CATEGORY_ORDER)
  );

  const toggleCategory = (category: NodeCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const groupedNodes = CATEGORY_ORDER.map((category) => ({
    category,
    items: NODE_PALETTE.filter((item) => item.category === category),
  }));

  return (
    <aside className="w-56 bg-canvas-surface border-r border-canvas-border flex flex-col overflow-hidden">
      {/* Title */}
      <div className="px-3 py-3 border-b border-canvas-border">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Node Palette
        </p>
        <p className="text-[10px] text-gray-600 mt-0.5">
          Drag nodes onto canvas
        </p>
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {groupedNodes.map(({ category, items }) => (
          <div key={category}>
            <button
              onClick={() => toggleCategory(category)}
              className="flex items-center gap-1 w-full px-1 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-400"
            >
              {expandedCategories.has(category) ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              {CATEGORY_LABELS[category]}
            </button>
            {expandedCategories.has(category) && (
              <div className="space-y-0.5 ml-1">
                {items.map((item) => (
                  <NodePaletteItem key={item.type} item={item} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Workflow templates */}
      <div className="px-3 py-3 border-t border-canvas-border">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Quick Workflows
        </p>
        <div className="space-y-1">
          {getWorkflowTemplates().map((template) => (
            <button
              key={template.label}
              onClick={() => {
                const { nodes, edges } = createWorkflow(template);
                loadWorkflow(nodes, edges);
              }}
              className="w-full text-left px-2 py-1.5 rounded border border-canvas-border hover:border-accent-primary/30 hover:bg-accent-primary/5 transition-colors"
            >
              <p className="text-xs text-gray-300">{template.label}</p>
              <p className="text-[10px] text-gray-600">{template.description}</p>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
