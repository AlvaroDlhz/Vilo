import './VideoPlayer.css';

export interface VideoPlayerOptions {
  videoUrl?: string;
  gradientIndex?: number;
  duration?: string;
  onEnded?: () => void;
}

const gradientClasses = [
  'gradient-1', 'gradient-2', 'gradient-3', 'gradient-4',
  'gradient-5', 'gradient-6', 'gradient-7', 'gradient-8',
];

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function VideoPlayer(options: VideoPlayerOptions = {}): HTMLDivElement {
  const { videoUrl, gradientIndex = 0, duration = '0:00', onEnded } = options;

  const player = document.createElement('div');

  // If we have a real video URL, use a real <video> element
  if (videoUrl) {
    player.className = 'video-player';
    return buildRealPlayer(player, videoUrl, onEnded);
  }

  // Fallback: gradient mock player
  player.className = `video-player ${gradientClasses[gradientIndex % gradientClasses.length]}`;
  return buildMockPlayer(player, duration, onEnded);
}

function buildRealPlayer(player: HTMLDivElement, videoUrl: string, onEnded?: () => void): HTMLDivElement {
  const video = document.createElement('video');
  video.className = 'video-player-video';
  video.src = videoUrl;
  video.preload = 'metadata';
  video.playsInline = true;

  // Play button overlay
  const playBtn = document.createElement('button');
  playBtn.className = 'video-player-play';
  playBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`;

  // Controls bar
  const controls = document.createElement('div');
  controls.className = 'video-player-controls';

  const progress = document.createElement('div');
  progress.className = 'video-player-progress';
  const progressFill = document.createElement('div');
  progressFill.className = 'video-player-progress-fill';
  progress.appendChild(progressFill);

  const controlsRow = document.createElement('div');
  controlsRow.className = 'video-player-controls-row';

  // Left controls
  const leftControls = document.createElement('div');
  leftControls.className = 'video-player-controls-left';

  const playPauseBtn = createControlBtn(`<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`);

  const volumeContainer = document.createElement('div');
  volumeContainer.className = 'video-player-volume';
  const volumeBtn = createControlBtn(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`);
  const volumeSlider = document.createElement('input');
  volumeSlider.type = 'range';
  volumeSlider.className = 'video-player-volume-slider';
  volumeSlider.min = '0';
  volumeSlider.max = '100';
  volumeSlider.value = '75';
  volumeContainer.append(volumeBtn, volumeSlider);

  const timeDisplay = document.createElement('span');
  timeDisplay.className = 'video-player-time';
  timeDisplay.textContent = '0:00 / 0:00';

  leftControls.append(playPauseBtn, volumeContainer, timeDisplay);

  // Right controls
  const rightControls = document.createElement('div');
  rightControls.className = 'video-player-controls-right';

  const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const speedContainer = document.createElement('div');
  speedContainer.className = 'video-player-speed';
  const speedBtn = document.createElement('button');
  speedBtn.className = 'video-player-btn video-player-speed-btn';
  speedBtn.title = 'Velocidad de reproducción';
  speedBtn.textContent = '1x';
  const speedMenu = document.createElement('div');
  speedMenu.className = 'video-player-speed-menu';
  speeds.forEach(speed => {
    const item = document.createElement('button');
    item.className = 'video-player-speed-option' + (speed === 1 ? ' active' : '');
    item.textContent = speed === 1 ? 'Normal' : `${speed}x`;
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      video.playbackRate = speed;
      speedBtn.textContent = speed === 1 ? '1x' : `${speed}x`;
      speedMenu.querySelectorAll('.video-player-speed-option').forEach(o => o.classList.remove('active'));
      item.classList.add('active');
      speedMenu.classList.remove('open');
    });
    speedMenu.appendChild(item);
  });
  speedBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    speedMenu.classList.toggle('open');
  });
  document.addEventListener('click', () => speedMenu.classList.remove('open'));
  speedContainer.append(speedBtn, speedMenu);

  const pipBtn = createControlBtn(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><rect x="11" y="9" width="9" height="7" rx="1" ry="1"/></svg>`);
  pipBtn.title = 'Imagen sobre imagen';

  const fullscreenBtn = createControlBtn(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`);
  fullscreenBtn.title = 'Pantalla completa';

  rightControls.append(speedContainer, pipBtn, fullscreenBtn);
  controlsRow.append(leftControls, rightControls);
  controls.append(progress, controlsRow);
  player.append(video, playBtn, controls);

  // --- Wire up real playback ---
  video.volume = 0.75;

  // Autoplay: try with sound first. If the browser blocks it (e.g. page
  // reload without prior interaction), fall back to muted autoplay and
  // show an "unmute" overlay so the user can restore sound with one click.
  const unmuteOverlay = document.createElement('button');
  unmuteOverlay.className = 'video-player-unmute';
  unmuteOverlay.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg> Activar sonido`;
  unmuteOverlay.style.display = 'none';
  player.appendChild(unmuteOverlay);

  unmuteOverlay.addEventListener('click', (e) => {
    e.stopPropagation();
    video.muted = false;
    video.volume = 0.75;
    volumeSlider.value = '75';
    unmuteOverlay.style.display = 'none';
  });

  video.play().catch(() => {
    video.muted = true;
    volumeSlider.value = '0';
    video.play().then(() => {
      unmuteOverlay.style.display = '';
    }).catch(() => {});
  });

  function togglePlay() {
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }

  function updatePlayIcon() {
    const icon = video.paused
      ? `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
    playPauseBtn.innerHTML = icon;
    if (video.paused) {
      playBtn.classList.remove('video-player-play--hidden');
    } else {
      playBtn.classList.add('video-player-play--hidden');
    }
  }

  video.addEventListener('play', updatePlayIcon);
  video.addEventListener('pause', updatePlayIcon);

  video.addEventListener('loadedmetadata', () => {
    timeDisplay.textContent = `0:00 / ${formatTime(video.duration)}`;
  });

  video.addEventListener('timeupdate', () => {
    if (video.duration) {
      const pct = (video.currentTime / video.duration) * 100;
      progressFill.style.width = `${pct}%`;
      timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
    }
  });

  video.addEventListener('ended', () => {
    onEnded?.();
  });

  playBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePlay(); });
  playPauseBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePlay(); });
  player.addEventListener('click', () => togglePlay());

  controls.addEventListener('click', (e) => {
    if (e.target !== controls && e.target !== playPauseBtn && !playPauseBtn.contains(e.target as Node)) {
      e.stopPropagation();
    }
  });

  // Progress seeking
  progress.addEventListener('click', (e) => {
    e.stopPropagation();
    const rect = progress.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    video.currentTime = pct * video.duration;
  });

  // Volume
  volumeSlider.addEventListener('input', () => {
    video.volume = parseInt(volumeSlider.value) / 100;
  });

  volumeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    video.muted = !video.muted;
    volumeSlider.value = video.muted ? '0' : String(Math.round(video.volume * 100));
  });

  // PiP
  pipBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    } else {
      video.requestPictureInPicture();
    }
  });

  // Fullscreen
  fullscreenBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      player.requestFullscreen();
    }
  });

  return player;
}

function buildMockPlayer(player: HTMLDivElement, duration: string, onEnded?: () => void): HTMLDivElement {
  const playBtn = document.createElement('button');
  playBtn.className = 'video-player-play';
  playBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`;

  let isPlaying = false;

  const controls = document.createElement('div');
  controls.className = 'video-player-controls';

  const progress = document.createElement('div');
  progress.className = 'video-player-progress';
  const progressFill = document.createElement('div');
  progressFill.className = 'video-player-progress-fill';
  progressFill.style.width = '0%';
  progress.appendChild(progressFill);

  const controlsRow = document.createElement('div');
  controlsRow.className = 'video-player-controls-row';

  const leftControls = document.createElement('div');
  leftControls.className = 'video-player-controls-left';

  const playPauseBtn = createControlBtn(`<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`);

  const timeDisplay = document.createElement('span');
  timeDisplay.className = 'video-player-time';
  timeDisplay.textContent = `0:00 / ${duration}`;

  leftControls.append(playPauseBtn, timeDisplay);
  controlsRow.append(leftControls);
  controls.append(progress, controlsRow);
  player.append(playBtn, controls);

  let progressValue = 0;
  let intervalId: number | null = null;

  function togglePlay() {
    isPlaying = !isPlaying;
    if (isPlaying) {
      playBtn.classList.add('video-player-play--hidden');
      playPauseBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
      intervalId = window.setInterval(() => {
        progressValue = Math.min(progressValue + 0.2, 100);
        progressFill.style.width = `${progressValue}%`;
        if (progressValue >= 100) {
          togglePlay();
          onEnded?.();
        }
      }, 300);
    } else {
      playBtn.classList.remove('video-player-play--hidden');
      playPauseBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`;
      if (intervalId !== null) { clearInterval(intervalId); intervalId = null; }
    }
  }

  playBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePlay(); });
  playPauseBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePlay(); });
  player.addEventListener('click', () => togglePlay());

  controls.addEventListener('click', (e) => {
    if (e.target !== controls && e.target !== playPauseBtn && !playPauseBtn.contains(e.target as Node)) {
      e.stopPropagation();
    }
  });

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const removed of mutation.removedNodes) {
        if (removed === player || (removed instanceof Element && removed.contains(player))) {
          if (intervalId !== null) { clearInterval(intervalId); intervalId = null; }
          observer.disconnect();
          return;
        }
      }
    }
  });

  requestAnimationFrame(() => {
    if (player.parentNode) observer.observe(player.parentNode, { childList: true });
  });

  return player;
}

function createControlBtn(svgHTML: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'video-player-btn';
  btn.innerHTML = svgHTML;
  return btn;
}
