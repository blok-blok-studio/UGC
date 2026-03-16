/**
 * Client-side chroma key compositing.
 * Overlays a green-screen video onto a background video using Canvas API.
 */

export async function chromaKeyComposite(
  bgVideoUrl: string,
  gsVideoUrl: string,
  onProgress?: (pct: number) => void,
): Promise<File> {
  // Load both videos
  const [bgVideo, gsVideo] = await Promise.all([
    loadVideo(bgVideoUrl),
    loadVideo(gsVideoUrl),
  ]);

  // Use background video dimensions, scale to max 720p
  const scale = Math.min(1, 720 / Math.max(bgVideo.videoWidth, bgVideo.videoHeight));
  const width = Math.round(bgVideo.videoWidth * scale) & ~1; // ensure even
  const height = Math.round(bgVideo.videoHeight * scale) & ~1;

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

  // Set up MediaRecorder
  const stream = canvas.captureStream(30);
  // Prefer MP4 (H.264) for universal playback, fallback to WebM
  const mimeType = MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")
    ? "video/mp4;codecs=avc1"
    : MediaRecorder.isTypeSupported("video/mp4")
      ? "video/mp4"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
        ? "video/webm;codecs=vp8"
        : "video/webm";
  const ext = mimeType.startsWith("video/mp4") ? "mp4" : "webm";
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const done = new Promise<File>((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve(new File([blob], `composite.${ext}`, { type: mimeType }));
    };
    recorder.onerror = () => reject(new Error("Recording failed"));
  });

  recorder.start();

  // Use shorter video duration as the composite length
  const duration = Math.min(bgVideo.duration, gsVideo.duration);

  // Play both videos
  bgVideo.currentTime = 0;
  gsVideo.currentTime = 0;
  bgVideo.muted = true;
  gsVideo.muted = true;

  await Promise.all([
    new Promise<void>((r) => { bgVideo.oncanplay = () => r(); }),
    new Promise<void>((r) => { gsVideo.oncanplay = () => r(); }),
  ]);

  bgVideo.play();
  gsVideo.play();

  // Render loop
  await new Promise<void>((resolve) => {
    function renderFrame() {
      if (bgVideo.ended || gsVideo.ended || bgVideo.currentTime >= duration) {
        recorder.stop();
        resolve();
        return;
      }

      // Draw background
      ctx.drawImage(bgVideo, 0, 0, width, height);

      // Draw green screen to offscreen canvas
      gsCtx.drawImage(gsVideo, 0, 0, width, height);
      const imageData = gsCtx.getImageData(0, 0, width, height);
      const pixels = imageData.data;

      // Chroma key: replace green pixels with transparency
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        // Green detection: high green, relatively low red and blue
        if (g > 120 && r < 150 && b < 150 && g > r * 1.2 && g > b * 1.2) {
          pixels[i + 3] = 0; // fully transparent
        } else if (g > 100 && r < 180 && b < 180 && g > r && g > b) {
          // Edge softening for semi-green pixels
          const greenness = (g - Math.max(r, b)) / g;
          pixels[i + 3] = Math.round(255 * (1 - greenness));
        }
      }

      gsCtx.putImageData(imageData, 0, 0);

      // Composite green screen onto background
      ctx.drawImage(gsCanvas, 0, 0);

      // Report progress
      if (duration > 0) {
        onProgress?.(Math.round((bgVideo.currentTime / duration) * 100));
      }

      requestAnimationFrame(renderFrame);
    }

    requestAnimationFrame(renderFrame);
  });

  return done;
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
