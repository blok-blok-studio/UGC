"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload, AlertCircle } from "lucide-react";
import { formatFileSize } from "@/lib/file-utils";

interface DropZoneProps {
  accept: "image" | "video" | "both";
  onFile: (file: File) => void;
  compact?: boolean;
  disabled?: boolean;
}

const ACCEPT_MAP = {
  image: { "image/jpeg": [], "image/png": [], "image/webp": [], "image/gif": [] },
  video: { "video/mp4": [], "video/webm": [], "video/quicktime": [] },
  both: {
    "image/jpeg": [], "image/png": [], "image/webp": [], "image/gif": [],
    "video/mp4": [], "video/webm": [], "video/quicktime": [],
  },
};

const MAX_SIZES = { image: 10 * 1024 * 1024, video: 50 * 1024 * 1024 };

export default function DropZone({ accept, onFile, compact, disabled }: DropZoneProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setError(null);
      if (rejectedFiles.length > 0) {
        setError(rejectedFiles[0].errors[0]?.message || "Invalid file");
        return;
      }
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        const maxSize = file.type.startsWith("video/")
          ? MAX_SIZES.video
          : MAX_SIZES.image;
        if (file.size > maxSize) {
          setError(`File too large. Max: ${formatFileSize(maxSize)}`);
          return;
        }
        onFile(file);
      }
    },
    [onFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT_MAP[accept],
    maxFiles: 1,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg transition-all cursor-pointer
        ${isDragActive ? "border-accent-primary bg-accent-primary/10" : "border-canvas-border hover:border-accent-primary/50"}
        ${compact ? "p-2" : "p-4"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input {...getInputProps()} />
      <div className={`flex flex-col items-center gap-1 text-center ${compact ? "text-xs" : "text-sm"}`}>
        <Upload className={`text-gray-500 ${compact ? "w-4 h-4" : "w-6 h-6"}`} />
        {isDragActive ? (
          <p className="text-accent-primary">Drop here</p>
        ) : (
          <p className="text-gray-400">
            {compact ? "Drop file" : `Drag & drop ${accept === "both" ? "file" : accept}`}
          </p>
        )}
        {error && (
          <p className="text-accent-error flex items-center gap-1 text-xs">
            <AlertCircle className="w-3 h-3" /> {error}
          </p>
        )}
      </div>
    </div>
  );
}
