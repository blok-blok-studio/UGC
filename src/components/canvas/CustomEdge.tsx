"use client";

import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const color = selected ? "#818cf8" : "#6366f1";

  return (
    <>
      {/* Glow effect */}
      <BaseEdge
        id={`${id}-glow`}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: selected ? 6 : 4,
          opacity: 0.15,
          filter: "blur(4px)",
        }}
      />
      {/* Main edge — solid line for connected edges */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: 2,
        }}
      />
    </>
  );
}
