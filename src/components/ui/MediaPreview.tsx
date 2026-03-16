"use client";

import { useState } from "react";
import { X, Maximize2 } from "lucide-react";

interface MediaPreviewProps {
  url: string;
  type: "image" | "video";
  compact?: boolean;
  onRemove?: () => void;
}

export default function MediaPreview({ url, type, compact, onRemove }: MediaPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className={`relative group rounded-md overflow-hidden bg-black/20 ${compact ? "h-20" : "h-32"}`}>
        {type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <video src={url} className="w-full h-full object-cover" muted loop playsInline autoPlay />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <button
            onClick={() => setExpanded(true)}
            className="p-1.5 bg-white/20 rounded-full hover:bg-white/30"
          >
            <Maximize2 className="w-3 h-3 text-white" />
          </button>
          {onRemove && (
            <button
              onClick={onRemove}
              className="p-1.5 bg-red-500/60 rounded-full hover:bg-red-500/80"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded modal */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
          onClick={() => setExpanded(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setExpanded(false)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
            {type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="Preview" className="max-w-full max-h-[80vh] object-contain rounded-lg" />
            ) : (
              <video src={url} className="max-w-full max-h-[80vh] rounded-lg" controls autoPlay />
            )}
          </div>
        </div>
      )}
    </>
  );
}
