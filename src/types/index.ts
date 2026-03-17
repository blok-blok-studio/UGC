import type { Node, Edge } from "@xyflow/react";

// ── Node Data Types ──────────────────────────────────────────────

export type NodeCategory = "input" | "processor" | "output";

export interface BaseNodeData {
  label: string;
  category: NodeCategory;
  status: "idle" | "uploading" | "processing" | "complete" | "error";
  error?: string;
  [key: string]: unknown;
}

export interface ImageNodeData extends BaseNodeData {
  category: "input";
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  thumbnailUrl?: string;
}

export interface VideoNodeData extends BaseNodeData {
  category: "input";
  fileUrl?: string;
  fileName?: string;
  duration?: number;
  thumbnailUrl?: string;
}

export interface ProductNodeData extends BaseNodeData {
  category: "input";
  fileUrl?: string;
  fileName?: string;
  thumbnailUrl?: string;
  backgroundRemoved?: boolean;
}

export interface PromptNodeData extends BaseNodeData {
  category: "input";
  prompt: string;
  angle?: "front" | "side" | "three-quarter" | "overhead" | "low-angle";
  background?: string;
  style?: string;
  duration?: number;
}

export interface FaceSwapNodeData extends BaseNodeData {
  category: "processor";
  resultUrl?: string;
  preserveHair?: "user" | "target";
}

export interface CharacterSwapNodeData extends BaseNodeData {
  category: "processor";
  resultUrl?: string;
  orientation?: "video" | "image";
  scenePrompt?: string;
  removeBg?: boolean;
  progressText?: string;
}

export interface AudioNodeData extends BaseNodeData {
  category: "input";
  fileUrl?: string;
  fileName?: string;
  thumbnailUrl?: string;
}

export interface TextToVideoNodeData extends BaseNodeData {
  category: "processor";
  resultUrl?: string;
  duration?: number;
  progressText?: string;
  selectedModel?: string;
  generateAudio?: boolean;
  resolution?: "480p" | "720p" | "1080p";
}

export interface ProductPlacementNodeData extends BaseNodeData {
  category: "processor";
  resultUrl?: string;
}

export interface BackgroundNodeData extends BaseNodeData {
  category: "processor";
  resultUrl?: string;
  backgroundPrompt?: string;
}

export interface CompositeNodeData extends BaseNodeData {
  category: "processor";
  resultUrl?: string;
  progressText?: string;
}

export interface OutputNodeData extends BaseNodeData {
  category: "output";
  resultUrl?: string;
  resultType?: "image" | "video";
  fileName?: string;
}

export type AppNodeData =
  | ImageNodeData
  | VideoNodeData
  | ProductNodeData
  | PromptNodeData
  | AudioNodeData
  | FaceSwapNodeData
  | CharacterSwapNodeData
  | TextToVideoNodeData
  | ProductPlacementNodeData
  | BackgroundNodeData
  | CompositeNodeData
  | OutputNodeData;

export type AppNode = Node<AppNodeData>;
export type AppEdge = Edge;

// ── Node Palette Items ───────────────────────────────────────────

export interface PaletteItem {
  type: string;
  label: string;
  category: NodeCategory;
  description: string;
  color: string;
  icon: string;
  inputs: string[];
  outputs: string[];
}

// ── Generation Types ─────────────────────────────────────────────

export type ModelId =
  | "easel-ai/advanced-face-swap"
  | "fal-ai/kling-video/v2.6/pro/motion-control"
  | "fal-ai/kling-video/v3/pro/text-to-video"
  | "fal-ai/kling-video/v3/pro/image-to-video"
  | "fal-ai/bytedance/omnihuman/v1.5"
  | "fal-ai/bria/rmbg/v2"
  | "fal-ai/flux/schnell"
  | "bria/video/background-removal";

export interface GenerationRequest {
  modelId: ModelId;
  inputs: Record<string, unknown>;
  nodeId: string;
}

export interface GenerationResult {
  nodeId: string;
  resultUrl: string;
  resultType: "image" | "video";
  metadata?: Record<string, unknown>;
}

// ── File Upload Types ────────────────────────────────────────────

export interface UploadedFile {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/mp3",
  "audio/ogg",
  "audio/aac",
  "audio/m4a",
] as const;

export const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
