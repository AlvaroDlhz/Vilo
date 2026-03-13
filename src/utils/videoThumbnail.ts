function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('Timed out')), ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

function cleanupVideo(video: HTMLVideoElement): void {
  video.pause();
  video.removeAttribute('src');
  video.load();
}

function waitForMetadata(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 1) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Failed to load video metadata'));
    };
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onError);
    };

    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('error', onError);
  });
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  if (Math.abs(video.currentTime - time) < 0.001 && video.readyState >= 2) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Failed to seek video'));
    };
    const cleanup = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
    };

    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);

    try {
      video.currentTime = time;
    } catch (error) {
      cleanup();
      reject(error instanceof Error ? error : new Error('Invalid seek time'));
    }
  });
}

function pickRandomFrameTime(duration: number): number {
  const max = Math.max(duration - 0.1, 0);
  const min = Math.min(0.1, max);
  if (max <= min) return max;
  return min + Math.random() * (max - min);
}

async function captureRandomFrameBlobFromUrl(
  url: string,
  useAnonymousCors: boolean
): Promise<Blob | null> {
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;
  if (useAnonymousCors) {
    video.crossOrigin = 'anonymous';
  }
  video.src = url;

  try {
    await withTimeout(waitForMetadata(video), 10000);

    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      return null;
    }

    const seekTime = pickRandomFrameTime(video.duration);
    await withTimeout(seekTo(video, seekTime), 10000);

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return null;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.86);
    });

    return blob;
  } catch {
    return null;
  } finally {
    cleanupVideo(video);
  }
}

export async function captureRandomFrameAsDataUrl(videoUrl: string): Promise<string | null> {
  const blob = await captureRandomFrameBlobFromUrl(videoUrl, true);
  if (!blob) return null;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

export async function captureRandomFrameAsFile(videoFile: File): Promise<File | null> {
  const objectUrl = URL.createObjectURL(videoFile);

  try {
    const blob = await captureRandomFrameBlobFromUrl(objectUrl, false);
    if (!blob) return null;

    const baseName = videoFile.name.replace(/\.[^/.]+$/, '') || 'video';
    return new File([blob], `${baseName}-thumbnail.jpg`, { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
