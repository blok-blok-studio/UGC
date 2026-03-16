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

  return (
    <>
      {/* Glow effect */}
      <BaseEdge
        id={`${id}-glow`}
        path={edgePath}
        style={{
          stroke: selected ? "#818cf8" : "#6366f1",
          strokeWidth: selected ? 6 : 4,
          opacity: 0.15,
          filter: "blur(4px)",
        }}
      />
      {/* Main edge with animated dash */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? "#818cf8" : "#6366f1",
          strokeWidth: 2,
          strokeDasharray: "6 6",
          animation: "flowLine 1.5s linear infinite",
        }}
      />
    </>
  );
}
