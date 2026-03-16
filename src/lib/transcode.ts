/**
 * Client-side video transcoding using Canvas + MediaRecorder.
 * Re-encodes videos (e.g., iPhone HEVC) to WebM VP8 which fal.ai accepts.
 */

export async function needsTranscode(file: File): Promise<boolean> {
  // Check if the browser can play this video natively
  // If it can't, we can't transcode either — just try uploading as-is
  const video = document.createElement("video");
  const canPlay = video.canPlayType(file.type);
  if (!canPlay) return false;

  // iPhone videos (HEVC/H.265) often have video/mp4 type but HEVC codec
  // Safari can play them but fal.ai can't process them
  // Transcode all videos to be safe — it's fast for short clips
  return file.type.startsWith("video/");
}

export async function transcodeToWebM(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadedmetadata = () => {
      // Cap at 720p to keep file sizes reasonable
      const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
      const width = Math.round(video.videoWidth * scale / 2) * 2; // ensure even
      const height = Math.round(video.videoHeight * scale / 2) * 2;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;

      const stream = canvas.captureStream(30); // 30fps
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
        ? "video/webm;codecs=vp8"
        : "video/webm";

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2_000_000, // 2Mbps
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        URL.revokeObjectURL(url);
        const blob = new Blob(chunks, { type: "video/webm" });
        const newName = file.name.replace(/\.[^.]+$/, ".webm");
        const newFile = new File([blob], newName, { type: "video/webm" });
        resolve(newFile);
      };

      recorder.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Video transcoding failed"));
      };

      // Draw frames
      recorder.start();
      video.currentTime = 0;

      const drawFrame = () => {
        if (video.ended || video.paused) {
          recorder.stop();
          return;
        }
        ctx.drawImage(video, 0, 0, width, height);
        onProgress?.(Math.min(99, Math.round((video.currentTime / video.duration) * 100)));
        requestAnimationFrame(drawFrame);
      };

      video.onplay = drawFrame;
      video.play().catch(reject);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load video for transcoding"));
    };
  });
}
