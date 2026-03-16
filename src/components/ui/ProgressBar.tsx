"use client";

import { motion } from "framer-motion";

interface ProgressBarProps {
  label?: string;
  indeterminate?: boolean;
}

export default function ProgressBar({ label, indeterminate = true }: ProgressBarProps) {
  return (
    <div className="w-full">
      {label && (
        <p className="text-xs text-gray-400 mb-1 truncate">{label}</p>
      )}
      <div className="w-full h-1.5 bg-canvas-border rounded-full overflow-hidden">
        {indeterminate ? (
          <motion.div
            className="h-full bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary rounded-full"
            style={{ width: "40%" }}
            animate={{ x: ["-100%", "250%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : (
          <div className="h-full bg-accent-primary rounded-full w-full" />
        )}
      </div>
    </div>
  );
}
