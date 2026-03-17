/**
 * Client-side chroma key compositing.
 * Overlays a green-screen video onto a background video using Canvas API.
 * Uses frame-by-frame seeking + mp4-muxer for MP4 output.
 * Falls back to MediaRecorder (WebM) if VideoEncoder is unavailable.
 */

const FPS = 24;
const SEEK_TIMEOUT_MS = 5000;

export async function chromaKeyComposite(
  bgVideoUrl: string,
  gsVideoUrl: string,
  onProgress?: (pct: number) => void,
): Promise<File> {
  onProgress?.(0);

  // Load both videos as blobs (avoids CORS)
  const [bgVideo, gsVideo] = await Promise.all([
    loadVideo(bgVideoUrl, (p) => onProgress?.(Math.round(p * 15))),
    loadVideo(gsVideoUrl, (p) => onProgress?.(15 + Math.round(p * 15))),
  ]);

  onProgress?.(30);

  // Use background video dimensions, scale to max 720p
  const maxDim = Math.max(bgVideo.videoWidth, bgVideo.videoHeight);
  const scale = maxDim > 720 ? 720 / maxDim : 1;
  const width = Math.round(bgVideo.videoWidth * scale) & ~1;
  const height = Math.round(bgVideo.videoHeight * scale) & ~1;

  if (width <= 0 || height <= 0) {
    throw new Error(`Invalid video dimensions: ${bgVideo.videoWidth}x${bgVideo.videoHeight}`);
  }

  // Use shorter video duration
  const duration = Math.min(bgVideo.duration, gsVideo.duration);
  if (!duration || !isFinite(duration) || duration <= 0) {
    throw new Error(`Invalid video duration: bg=${bgVideo.duration}, gs=${gsVideo.duration}`);
  }
  const totalFrames = Math.floor(duration * FPS);

  // Canvas for compositing
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  const gsCanvas = document.createElement("canvas");
  gsCanvas.width = width;
  gsCanvas.height = height;
  const gsCtx = gsCanvas.getContext("2d", { willReadFrequently: true })!;

  // Check if we can use VideoEncoder (Chrome/Edge) or need MediaRecorder fallback
  const useWebCodecs = typeof VideoEncoder !== "undefined";

  if (useWebCodecs) {
    return compositeWithWebCodecs(bgVideo, gsVideo, canvas, ctx, gsCanvas, gsCtx, width, height, totalFrames, onProgress);
  } else {
    return compositeWithMediaRecorder(bgVideo, gsVideo, canvas, ctx, gsCanvas, gsCtx, width, height, duration, totalFrames, onProgress);
  }
}

async function compositeWithWebCodecs(
  bgVideo: HTMLVideoElement,
  gsVideo: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  gsCanvas: HTMLCanvasElement,
  gsCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  totalFrames: number,
  onProgress?: (pct: number) => void,
): Promise<File> {
  const { Muxer, ArrayBufferTarget } = await import("mp4-muxer");

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "avc", width, height },
    fastStart: "in-memory",
  });

  let encoderError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta ?? undefined),
    error: (e) => { encoderError = new Error(`VideoEncoder: ${e.message}`); },
  });

  encoder.configure({
    codec: "avc1.640028",
    width,
    height,
    bitrate: 4_000_000,
    framerate: FPS,
  });

  for (let frame = 0; frame < totalFrames; frame++) {
    if (encoderError) throw encoderError;

    const time = frame / FPS;
    await seekBoth(bgVideo, gsVideo, time);

    renderCompositeFrame(ctx, gsCtx, bgVideo, gsVideo, width, height);

    const videoFrame = new VideoFrame(canvas, {
      timestamp: frame * (1_000_000 / FPS),
      duration: 1_000_000 / FPS,
    });
    encoder.encode(videoFrame, { keyFrame: frame % (FPS * 2) === 0 });
    videoFrame.close();

    // Progress: 30-95% for frame processing
    onProgress?.(30 + Math.round(((frame + 1) / totalFrames) * 65));

    // Yield to UI every 3 frames
    if (frame % 3 === 0) await new Promise((r) => setTimeout(r, 0));
  }

  await encoder.flush();
  encoder.close();
  if (encoderError) throw encoderError;

  muxer.finalize();
  const buffer = (muxer.target as InstanceType<typeof ArrayBufferTarget>).buffer;
  onProgress?.(100);

  return new File([buffer], "composite.mp4", { type: "video/mp4" });
}

async function compositeWithMediaRecorder(
  bgVideo: HTMLVideoElement,
  gsVideo: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  gsCanvas: HTMLCanvasElement,
  gsCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  duration: number,
  totalFrames: number,
  onProgress?: (pct: number) => void,
): Promise<File> {
  const stream = canvas.captureStream(FPS);
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
    ? "video/webm;codecs=vp8" : "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const done = new Promise<File>((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve(new File([blob], "composite.webm", { type: mimeType }));
    };
    recorder.onerror = () => reject(new Error("MediaRecorder failed"));
  });

  recorder.start(1000); // chunk every second

  for (let frame = 0; frame < totalFrames; frame++) {
    const time = frame / FPS;
    await seekBoth(bgVideo, gsVideo, time);
    renderCompositeFrame(ctx, gsCtx, bgVideo, gsVideo, width, height);

    onProgress?.(30 + Math.round(((frame + 1) / totalFrames) * 65));
    if (frame % 3 === 0) await new Promise((r) => setTimeout(r, 0));
  }

  recorder.stop();
  onProgress?.(100);
  return done;
}

function renderCompositeFrame(
  ctx: CanvasRenderingContext2D,
  gsCtx: CanvasRenderingContext2D,
  bgVideo: HTMLVideoElement,
  gsVideo: HTMLVideoElement,
  width: number,
  height: number,
) {
  // Draw background
  ctx.drawImage(bgVideo, 0, 0, width, height);

  // Draw green screen to offscreen canvas
  gsCtx.clearRect(0, 0, width, height);
  gsCtx.drawImage(gsVideo, 0, 0, width, height);
  const imageData = gsCtx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  // Chroma key: make green pixels transparent
  // Bria outputs pure green (#00FF00) but video compression creates many shades
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    // Convert to HSV-like green detection for better accuracy
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const delta = maxC - minC;

    // Check if green is dominant channel
    if (g === maxC && delta > 20) {
      // Calculate how "green" this pixel is (0-1)
      // Hue check: is it in the green range?
      const hue = 60 * (((b - r) / delta) + 2); // simplified hue for green
      const saturation = delta / (maxC || 1);
      const greenness = saturation * (g / 255);

      if (hue > 60 && hue < 180 && saturation > 0.2 && g > 80) {
        // Strong green — fully transparent
        if (greenness > 0.4) {
          pixels[i + 3] = 0;
        } else {
          // Edge/spill — partial transparency
          pixels[i + 3] = Math.round(255 * (1 - greenness * 2));
        }
      }
    }
    // Also catch near-pure greens that compression might produce
    else if (g > 100 && g > r * 1.4 && g > b * 1.4) {
      pixels[i + 3] = 0;
    }
  }

  gsCtx.putImageData(imageData, 0, 0);
  ctx.drawImage(gsCtx.canvas, 0, 0);
}

async function seekBoth(v1: HTMLVideoElement, v2: HTMLVideoElement, time: number) {
  await Promise.all([seekTo(v1, time), seekTo(v2, time)]);
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (Math.abs(video.currentTime - time) < 0.02) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      video.onseeked = null;
      // Don't reject — just continue with current frame (avoids hanging)
      resolve();
    }, SEEK_TIMEOUT_MS);

    video.onseeked = () => {
      clearTimeout(timeout);
      video.onseeked = null;
      resolve();
    };
    video.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Video seek error"));
    };
    video.currentTime = time;
  });
}

async function loadVideo(
  url: string,
  onFetchProgress?: (pct: number) => void,
): Promise<HTMLVideoElement> {
  // Fetch as blob to avoid CORS
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch video (${res.status}): ${url.slice(0, 80)}...`);

  const contentLength = Number(res.headers.get("content-length") || 0);
  const reader = res.body?.getReader();

  let blob: Blob;
  if (reader && contentLength > 0) {
    // Stream with progress
    const chunks: BlobPart[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      onFetchProgress?.(received / contentLength);
    }
    blob = new Blob(chunks);
  } else {
    blob = await res.blob();
    onFetchProgress?.(1);
  }

  const blobUrl = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.playsInline = true;
    video.muted = true;

    // Wait for enough data to be available, not just metadata
    video.oncanplaythrough = () => {
      video.oncanplaythrough = null;
      video.onerror = null;
      resolve(video);
    };
    video.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error(`Failed to decode video: ${url.slice(0, 80)}...`));
    };

    // Timeout: if canplaythrough never fires, try with just metadata
    setTimeout(() => {
      if (video.readyState >= 1) {
        video.oncanplaythrough = null;
        video.onerror = null;
        resolve(video);
      }
    }, 10000);

    video.src = blobUrl;
    video.load();
  });
}
