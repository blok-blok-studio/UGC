import type { ModelId, PaletteItem } from "@/types";

// ── Model Configurations ─────────────────────────────────────────

export interface ModelConfig {
  id: ModelId;
  name: string;
  description: string;
  costEstimate: string;
  outputType: "image" | "video";
  maxDuration?: number;
}

export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  faceSwap: {
    id: "easel-ai/advanced-face-swap",
    name: "Advanced Face Swap",
    description: "Swap faces between images while preserving details",
    costEstimate: "$0.05/generation",
    outputType: "image",
  },
  characterSwap: {
    id: "fal-ai/kling-video/v2.6/pro/motion-control",
    name: "Character Swap (Motion Control)",
    description: "Transfer your movements to any character image",
    costEstimate: "~$0.10/second",
    outputType: "video",
    maxDuration: 30,
  },
  textToVideo: {
    id: "fal-ai/kling-video/v3/pro/text-to-video",
    name: "Text to Video",
    description: "Generate video from text prompts with custom angles",
    costEstimate: "~$0.10/second",
    outputType: "video",
    maxDuration: 10,
  },
  imageToVideo: {
    id: "fal-ai/kling-video/v3/pro/image-to-video",
    name: "Image to Video",
    description: "Animate a still image into video",
    costEstimate: "~$0.10/second",
    outputType: "video",
    maxDuration: 10,
  },
  avatarAnimation: {
    id: "fal-ai/bytedance/omnihuman/v1.5",
    name: "Avatar Animation",
    description: "Create talking/moving avatar from image + audio",
    costEstimate: "~$0.08/second",
    outputType: "video",
    maxDuration: 30,
  },
  backgroundRemoval: {
    id: "fal-ai/bria/rmbg/v2",
    name: "Background Removal",
    description: "Remove background from images",
    costEstimate: "$0.01/generation",
    outputType: "image",
  },
  imageGeneration: {
    id: "fal-ai/flux/schnell",
    name: "Image Generation",
    description: "Generate images from text prompts",
    costEstimate: "$0.003/generation",
    outputType: "image",
  },
};

// ── Model Options Per Node Type ──────────────────────────────────

export const NODE_MODEL_OPTIONS: Record<string, { id: string; name: string; cost: string }[]> = {
  faceSwapNode: [
    { id: "easel-ai/advanced-face-swap", name: "Advanced Face Swap", cost: "$0.05" },
  ],
  characterSwapNode: [
    { id: "fal-ai/kling-video/v2.6/pro/motion-control", name: "Kling v2.6 Pro", cost: "~$0.10/s" },
  ],
  textToVideoNode: [
    { id: "fal-ai/kling-video/v3/pro/image-to-video", name: "Kling 3.0 Pro + Audio (1 Image)", cost: "~$0.17/s" },
    { id: "fal-ai/kling-video/v3/pro/text-to-video", name: "Kling 3.0 Pro + Audio (Text Only)", cost: "~$0.17/s" },
    { id: "fal-ai/bytedance/seedance/v1.5/pro/image-to-video", name: "Seedance 1.5 + Audio (1 Image)", cost: "~$0.26/5s" },
    { id: "fal-ai/bytedance/seedance/v1.5/pro/text-to-video", name: "Seedance 1.5 + Audio (Text Only)", cost: "~$0.26/5s" },
    { id: "fal-ai/bytedance/seedance/v1/lite/reference-to-video", name: "Seedance 1.0 Multi-Image", cost: "~$0.05/s" },
  ],
  videoExtendNode: [
    { id: "fal-ai/veo3.1/fast/extend-video", name: "Veo 3.1 Fast + Audio", cost: "~$0.15/s" },
    { id: "fal-ai/veo3.1/extend-video", name: "Veo 3.1 Standard + Audio", cost: "~$0.40/s" },
    { id: "fal-ai/ltx-2.3/extend-video", name: "LTX-2.3 (Budget)", cost: "~$0.10/s" },
  ],
  productPlacementNode: [
    { id: "fal-ai/flux/schnell", name: "Flux Schnell", cost: "$0.003" },
  ],
  backgroundNode: [
    { id: "fal-ai/flux/schnell", name: "Flux Schnell", cost: "$0.003" },
    { id: "fal-ai/bria/rmbg/v2", name: "Bria BG Removal", cost: "$0.01" },
  ],
};

// ── Node Palette ─────────────────────────────────────────────────

export const NODE_PALETTE: PaletteItem[] = [
  // Input nodes
  {
    type: "imageNode",
    label: "Image",
    category: "input",
    description: "Upload or drag an image",
    color: "#3b82f6",
    icon: "Image",
    inputs: [],
    outputs: ["image"],
  },
  {
    type: "videoNode",
    label: "Video",
    category: "input",
    description: "Upload or record video",
    color: "#8b5cf6",
    icon: "Video",
    inputs: [],
    outputs: ["video"],
  },
  {
    type: "productNode",
    label: "Product",
    category: "input",
    description: "Upload product image",
    color: "#f59e0b",
    icon: "Package",
    inputs: [],
    outputs: ["image"],
  },
  {
    type: "promptNode",
    label: "Prompt",
    category: "input",
    description: "Text prompt with controls",
    color: "#10b981",
    icon: "Type",
    inputs: [],
    outputs: ["prompt"],
  },
  {
    type: "audioNode",
    label: "Audio",
    category: "input",
    description: "Upload MP3/WAV audio",
    color: "#f97316",
    icon: "Music",
    inputs: [],
    outputs: ["audio"],
  },
  // Processor nodes
  {
    type: "faceSwapNode",
    label: "Face Swap",
    category: "processor",
    description: "Swap faces between images",
    color: "#ec4899",
    icon: "Users",
    inputs: ["source_face", "target_image"],
    outputs: ["image"],
  },
  {
    type: "characterSwapNode",
    label: "Character Swap",
    category: "processor",
    description: "Transfer motion to character",
    color: "#ec4899",
    icon: "PersonStanding",
    inputs: ["reference_video", "character_image"],
    outputs: ["video"],
  },
  {
    type: "textToVideoNode",
    label: "Text to Video",
    category: "processor",
    description: "Prompt + up to 4 images → Video",
    color: "#ec4899",
    icon: "Wand2",
    inputs: ["prompt", "reference_image_1", "reference_image_2", "reference_image_3", "reference_image_4"],
    outputs: ["video"],
  },
  {
    type: "productPlacementNode",
    label: "Product Placement",
    category: "processor",
    description: "Place product in scene",
    color: "#ec4899",
    icon: "Hand",
    inputs: ["person_image", "product_image"],
    outputs: ["image"],
  },
  {
    type: "backgroundNode",
    label: "Background",
    category: "processor",
    description: "Change or generate background",
    color: "#ec4899",
    icon: "Layers",
    inputs: ["source_media", "background_prompt"],
    outputs: ["image"],
  },
  {
    type: "videoExtendNode",
    label: "Video Extend",
    category: "processor",
    description: "Extend video duration seamlessly",
    color: "#8b5cf6",
    icon: "FastForward",
    inputs: ["source_video", "prompt"],
    outputs: ["video"],
  },
  {
    type: "compositeNode",
    label: "Composite",
    category: "processor",
    description: "Overlay green screen onto background",
    color: "#8b5cf6",
    icon: "Layers",
    inputs: ["background_video", "greenscreen_video"],
    outputs: ["video"],
  },
  // Output nodes
  {
    type: "outputNode",
    label: "Output",
    category: "output",
    description: "Preview and download result",
    color: "#06b6d4",
    icon: "Download",
    inputs: ["media"],
    outputs: [],
  },
];
