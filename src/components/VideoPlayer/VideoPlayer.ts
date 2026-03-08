import './VideoPlayer.css';

export interface VideoPlayerOptions {
  gradientIndex?: number;
  duration?: string;
}

const gradientClasses = [
  'gradient-1', 'gradient-2', 'gradient-3', 'gradient-4',
  'gradient-5', 'gradient-6', 'gradient-7', 'gradient-8',
];

export function VideoPlayer(options: VideoPlayerOptions = {}): HTMLDivElement {
  const { gradientIndex = 0, duration = '12:34' } = options;

  const player = document.createElement('div');
  player.className = `video-player ${gradientClasses[gradientIndex % gradientClasses.length]}`;

  // Play button
  const playBtn = document.createElement('button');
  playBtn.className = 'video-player-play';
  playBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21"/>
    </svg>
  `;

  let isPlaying = false;

  // Controls bar
  const controls = document.createElement('div');
  controls.className = 'video-player-controls';

  // Progress bar
  const progress = document.createElement('div');
  progress.className = 'video-player-progress';
  const progressFill = document.createElement('div');
  progressFill.className = 'video-player-progress-fill';
  progressFill.style.width = '0%';
  progress.appendChild(progressFill);

  // Controls row
  const controlsRow = document.createElement('div');
  controlsRow.className = 'video-player-controls-row';

  // Left controls
  const leftControls = document.createElement('div');
  leftControls.className = 'video-player-controls-left';

  const playPauseBtn = createControlBtn(`
    <svg viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21"/>
    </svg>
  `);

  const volumeContainer = document.createElement('div');
  volumeContainer.className = 'video-player-volume';

  const volumeBtn = createControlBtn(`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
    </svg>
  `);

  const volumeSlider = document.createElement('input');
  volumeSlider.type = 'range';
  volumeSlider.className = 'video-player-volume-slider';
  volumeSlider.min = '0';
  volumeSlider.max = '100';
  volumeSlider.value = '75';

  volumeContainer.append(volumeBtn, volumeSlider);

  const timeDisplay = document.createElement('span');
  timeDisplay.className = 'video-player-time';
  timeDisplay.textContent = `0:00 / ${duration}`;

  leftControls.append(playPauseBtn, volumeContainer, timeDisplay);

  // Right controls
  const rightControls = document.createElement('div');
  rightControls.className = 'video-player-controls-right';

  const subtitlesBtn = createControlBtn(`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="12" x2="23" y2="12"/>
      <line x1="12" y1="4" x2="12" y2="20"/>
    </svg>
  `);
  subtitlesBtn.title = 'Subtítulos';

  const settingsBtn = createControlBtn(`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  `);
  settingsBtn.title = 'Ajustes';

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

  document.addEventListener('click', () => {
    speedMenu.classList.remove('open');
  });

  speedContainer.append(speedBtn, speedMenu);

  const pipBtn = createControlBtn(`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <rect x="11" y="9" width="9" height="7" rx="1" ry="1"/>
    </svg>
  `);
  pipBtn.title = 'Imagen sobre imagen';

  const fullscreenBtn = createControlBtn(`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
    </svg>
  `);
  fullscreenBtn.title = 'Pantalla completa';

  rightControls.append(subtitlesBtn, speedContainer, settingsBtn, pipBtn, fullscreenBtn);

  controlsRow.append(leftControls, rightControls);
  controls.append(progress, controlsRow);
  player.append(playBtn, controls);

  // Simulated playback
  let progressValue = 0;
  let intervalId: number | null = null;

  function togglePlay() {
    isPlaying = !isPlaying;
    if (isPlaying) {
      playBtn.classList.add('video-player-play--hidden');
      playPauseBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
        </svg>
      `;
      intervalId = window.setInterval(() => {
        progressValue = Math.min(progressValue + 0.2, 100);
        progressFill.style.width = `${progressValue}%`;
        if (progressValue >= 100) {
          togglePlay();
        }
      }, 300);
    } else {
      playBtn.classList.remove('video-player-play--hidden');
      playPauseBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5,3 19,12 5,21"/>
        </svg>
      `;
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }
  }

  playBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });

  playPauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });

  player.addEventListener('click', () => {
    togglePlay();
  });

  // Prevent control clicks from bubbling to player
  controls.addEventListener('click', (e) => {
    if (e.target !== controls && e.target !== playPauseBtn && !playPauseBtn.contains(e.target as Node)) {
      e.stopPropagation();
    }
  });

  // Cleanup on unmount via MutationObserver
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const removed of mutation.removedNodes) {
        if (removed === player || (removed instanceof Element && removed.contains(player))) {
          if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
          }
          observer.disconnect();
          return;
        }
      }
    }
  });

  // Observe parent once mounted
  requestAnimationFrame(() => {
    if (player.parentNode) {
      observer.observe(player.parentNode, { childList: true });
    }
  });

  return player;
}

function createControlBtn(svgHTML: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'video-player-btn';
  btn.innerHTML = svgHTML;
  return btn;
}
