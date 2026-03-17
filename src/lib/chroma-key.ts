/**
 * Client-side video compositing.
 * Overlays a transparent-background video onto a background video using Canvas API.
 * Uses frame-by-frame seeking + mp4-muxer for MP4 output.
 * No chroma key needed — the overlay video has a real alpha channel (WebM VP9).
 */

const FPS = 24;
const SEEK_TIMEOUT_MS = 5000;

export async function chromaKeyComposite(
  bgVideoUrl: string,
  overlayVideoUrl: string,
  onProgress?: (pct: number) => void,
): Promise<File> {
  onProgress?.(0);

  // Load both videos as blobs (avoids CORS)
  const [bgVideo, overlayVideo] = await Promise.all([
    loadVideo(bgVideoUrl, (p) => onProgress?.(Math.round(p * 15))),
    loadVideo(overlayVideoUrl, (p) => onProgress?.(15 + Math.round(p * 15))),
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
  const duration = Math.min(bgVideo.duration, overlayVideo.duration);
  if (!duration || !isFinite(duration) || duration <= 0) {
    throw new Error(`Invalid video duration: bg=${bgVideo.duration}, overlay=${overlayVideo.duration}`);
  }
  const totalFrames = Math.floor(duration * FPS);

  // Single canvas for compositing
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Use VideoEncoder + mp4-muxer if available, otherwise MediaRecorder
  const useWebCodecs = typeof VideoEncoder !== "undefined";

  if (useWebCodecs) {
    return compositeWithWebCodecs(bgVideo, overlayVideo, canvas, ctx, width, height, totalFrames, onProgress);
  } else {
    return compositeWithMediaRecorder(bgVideo, overlayVideo, canvas, ctx, width, height, duration, totalFrames, onProgress);
  }
}

async function compositeWithWebCodecs(
  bgVideo: HTMLVideoElement,
  overlayVideo: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
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
    await seekBoth(bgVideo, overlayVideo, time);

    // Draw background first, then overlay on top (alpha compositing happens automatically)
    ctx.drawImage(bgVideo, 0, 0, width, height);
    ctx.drawImage(overlayVideo, 0, 0, width, height);

    const videoFrame = new VideoFrame(canvas, {
      timestamp: frame * (1_000_000 / FPS),
      duration: 1_000_000 / FPS,
    });
    encoder.encode(videoFrame, { keyFrame: frame % (FPS * 2) === 0 });
    videoFrame.close();

    onProgress?.(30 + Math.round(((frame + 1) / totalFrames) * 65));
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
  overlayVideo: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
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

  recorder.start(1000);

  for (let frame = 0; frame < totalFrames; frame++) {
    const time = frame / FPS;
    await seekBoth(bgVideo, overlayVideo, time);

    ctx.drawImage(bgVideo, 0, 0, width, height);
    ctx.drawImage(overlayVideo, 0, 0, width, height);

    onProgress?.(30 + Math.round(((frame + 1) / totalFrames) * 65));
    if (frame % 3 === 0) await new Promise((r) => setTimeout(r, 0));
  }

  recorder.stop();
  onProgress?.(100);
  return done;
}

async function seekBoth(v1: HTMLVideoElement, v2: HTMLVideoElement, time: number) {
  await Promise.all([seekTo(v1, time), seekTo(v2, time)]);
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.02) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      video.onseeked = null;
      resolve();
    }, SEEK_TIMEOUT_MS);

    video.onseeked = () => {
      clearTimeout(timeout);
      video.onseeked = null;
      resolve();
    };
    video.onerror = () => {
      clearTimeout(timeout);
      resolve(); // Don't reject, just use current frame
    };
    video.currentTime = time;
  });
}

async function loadVideo(
  url: string,
  onFetchProgress?: (pct: number) => void,
): Promise<HTMLVideoElement> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch video (${res.status}): ${url.slice(0, 80)}...`);

  const contentLength = Number(res.headers.get("content-length") || 0);
  const reader = res.body?.getReader();

  let blob: Blob;
  if (reader && contentLength > 0) {
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

    video.oncanplaythrough = () => {
      video.oncanplaythrough = null;
      video.onerror = null;
      resolve(video);
    };
    video.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error(`Failed to decode video: ${url.slice(0, 80)}...`));
    };

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
