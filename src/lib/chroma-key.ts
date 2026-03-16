/**
 * Client-side chroma key compositing.
 * Overlays a green-screen video onto a background video using Canvas API.
 * Uses frame-by-frame seeking for reliability + mp4-muxer for proper MP4 output.
 */

import { Muxer, ArrayBufferTarget } from "mp4-muxer";

const FPS = 30;

export async function chromaKeyComposite(
  bgVideoUrl: string,
  gsVideoUrl: string,
  onProgress?: (pct: number) => void,
): Promise<File> {
  // Load both videos as blobs (avoids CORS)
  const [bgVideo, gsVideo] = await Promise.all([
    loadVideo(bgVideoUrl),
    loadVideo(gsVideoUrl),
  ]);

  // Use background video dimensions, scale to max 720p
  const scale = Math.min(1, 720 / Math.max(bgVideo.videoWidth, bgVideo.videoHeight));
  const width = Math.round(bgVideo.videoWidth * scale) & ~1;
  const height = Math.round(bgVideo.videoHeight * scale) & ~1;

  // Use shorter video duration
  const duration = Math.min(bgVideo.duration, gsVideo.duration);
  const totalFrames = Math.floor(duration * FPS);

  // Main canvas for composited output
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  // Offscreen canvas for green screen processing
  const gsCanvas = document.createElement("canvas");
  gsCanvas.width = width;
  gsCanvas.height = height;
  const gsCtx = gsCanvas.getContext("2d", { willReadFrequently: true })!;

  // Set up MP4 muxer with WebCodecs VideoEncoder
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: {
      codec: "avc",
      width,
      height,
    },
    fastStart: "in-memory",
  });

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta ?? undefined),
    error: (e) => console.error("VideoEncoder error:", e),
  });

  encoder.configure({
    codec: "avc1.640028", // H.264 High Profile
    width,
    height,
    bitrate: 4_000_000,
    framerate: FPS,
  });

  // Process frame by frame using seeking
  for (let frame = 0; frame < totalFrames; frame++) {
    const time = frame / FPS;

    // Seek both videos to the same timestamp
    await Promise.all([
      seekTo(bgVideo, time),
      seekTo(gsVideo, time),
    ]);

    // Draw background frame
    ctx.drawImage(bgVideo, 0, 0, width, height);

    // Draw green screen to offscreen canvas and chroma key it
    gsCtx.drawImage(gsVideo, 0, 0, width, height);
    const imageData = gsCtx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      // Green detection
      if (g > 120 && r < 150 && b < 150 && g > r * 1.2 && g > b * 1.2) {
        pixels[i + 3] = 0; // fully transparent
      } else if (g > 100 && r < 180 && b < 180 && g > r && g > b) {
        const greenness = (g - Math.max(r, b)) / g;
        pixels[i + 3] = Math.round(255 * (1 - greenness));
      }
    }

    gsCtx.putImageData(imageData, 0, 0);

    // Composite green screen onto background
    ctx.drawImage(gsCanvas, 0, 0);

    // Encode the composited frame
    const videoFrame = new VideoFrame(canvas, {
      timestamp: frame * (1_000_000 / FPS), // microseconds
      duration: 1_000_000 / FPS,
    });
    const isKeyFrame = frame % (FPS * 2) === 0; // keyframe every 2 seconds
    encoder.encode(videoFrame, { keyFrame: isKeyFrame });
    videoFrame.close();

    // Report progress
    onProgress?.(Math.round(((frame + 1) / totalFrames) * 100));

    // Yield to UI thread every 5 frames
    if (frame % 5 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  // Flush encoder and finalize MP4
  await encoder.flush();
  encoder.close();
  muxer.finalize();

  const buffer = (muxer.target as ArrayBufferTarget).buffer;
  const blob = new Blob([buffer], { type: "video/mp4" });
  return new File([blob], "composite.mp4", { type: "video/mp4" });
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.01) {
      resolve();
      return;
    }
    video.onseeked = () => resolve();
    video.currentTime = time;
  });
}

async function loadVideo(url: string): Promise<HTMLVideoElement> {
  // Fetch as blob to avoid CORS issues with fal.media
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch video: ${url}`);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.playsInline = true;
    video.muted = true;
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error(`Failed to load video: ${url}`));
    };
    video.src = blobUrl;
  });
}
