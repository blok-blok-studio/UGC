import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
} from "@/types";

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return `Invalid image type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF`;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return `Image too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 10MB`;
  }
  return null;
}

export function validateVideoFile(file: File): string | null {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type as (typeof ALLOWED_VIDEO_TYPES)[number])) {
    return `Invalid video type: ${file.type}. Allowed: MP4, WebM, MOV`;
  }
  if (file.size > MAX_VIDEO_SIZE) {
    return `Video too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 50MB`;
  }
  return null;
}

export function sanitizePrompt(prompt: string): string {
  // Remove potential injection patterns and limit length
  return prompt
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/[^\w\s.,!?;:'"()\-/\\@#$%&*+=[\]{}|~`]/g, "") // allow safe chars
    .trim()
    .slice(0, 2000); // max 2000 chars
}

export function validatePrompt(prompt: string): string | null {
  if (!prompt || prompt.trim().length === 0) {
    return "Prompt cannot be empty";
  }
  if (prompt.length > 2000) {
    return "Prompt too long. Max 2000 characters";
  }
  return null;
}
