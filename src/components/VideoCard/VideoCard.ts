import './VideoCard.css';
import { hashColor } from '../../utils/avatarColor';
import { getChannelIdByName } from '../../data/channelStore';
import { navigate } from '../../router/router';
import { captureRandomFrameAsDataUrl } from '../../utils/videoThumbnail';

export interface VideoCardOptions {
  thumbnail?: string;
  videoUrl?: string;
  title: string;
  channelName: string;
  channelAvatar?: string;
  views: string;
  uploadedAt: string;
  duration?: string;
  progress?: number;
  gradientIndex?: number;
  variant?: 'default' | 'compact' | 'owner';
  showChannelName?: boolean;
  onClick?: () => void;
}

const gradientClasses = [
  'gradient-1', 'gradient-2', 'gradient-3', 'gradient-4',
  'gradient-5', 'gradient-6', 'gradient-7', 'gradient-8',
];

const generatedThumbnailCache = new Map<string, Promise<string | null>>();

function getGeneratedThumbnail(videoUrl: string): Promise<string | null> {
  const cached = generatedThumbnailCache.get(videoUrl);
  if (cached) return cached;

  const generation = captureRandomFrameAsDataUrl(videoUrl).catch(() => null);
  generatedThumbnailCache.set(videoUrl, generation);
  return generation;
}

async function applyGeneratedThumbnail(
  container: HTMLDivElement,
  videoUrl: string,
  title: string
): Promise<void> {
  const frame = await getGeneratedThumbnail(videoUrl);
  if (!frame || !container.isConnected) return;
  if (container.querySelector('.video-card-thumbnail-img')) return;

  const img = document.createElement('img');
  img.className = 'video-card-thumbnail-img';
  img.src = frame;
  img.alt = title;
  img.loading = 'lazy';
  container.prepend(img);
}

export function VideoCard(options: VideoCardOptions): HTMLDivElement {
  const {
    thumbnail, videoUrl, title, channelName, channelAvatar, views,
    uploadedAt, duration, progress, gradientIndex = 0, variant = 'default', showChannelName = true, onClick,
  } = options;

  const isCompact = variant === 'compact';
  const isOwner = variant === 'owner';

  const card = document.createElement('div');
  card.className = [
    'video-card',
    isCompact ? 'video-card--compact' : '',
    isOwner ? 'video-card--owner' : '',
  ].filter(Boolean).join(' ');

  const thumb = document.createElement('div');
  if (thumbnail) {
    thumb.className = 'video-card-thumbnail';
    const img = document.createElement('img');
    img.className = 'video-card-thumbnail-img';
    img.src = thumbnail;
    img.alt = title;
    img.loading = 'lazy';
    thumb.appendChild(img);
  } else {
    thumb.className = `video-card-thumbnail ${gradientClasses[gradientIndex % gradientClasses.length]}`;
    if (videoUrl) {
      void applyGeneratedThumbnail(thumb, videoUrl, title);
    }
  }

  const actions = document.createElement('div');
  actions.className = 'thumbnail-actions';

  const watchLater = createActionBtn('Ver mas tarde', `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  `);

  const menuBtn = createActionBtn('Mas opciones', `
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="6" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="18" r="1.5"/>
    </svg>
  `);

  actions.append(watchLater, menuBtn);
  thumb.appendChild(actions);

  if (duration) {
    const dur = document.createElement('span');
    dur.className = 'video-card-duration';
    dur.textContent = duration;
    thumb.appendChild(dur);
  }

  if (progress !== undefined && progress > 0) {
    const bar = document.createElement('div');
    bar.className = 'video-card-progress';
    const fill = document.createElement('div');
    fill.className = 'video-card-progress-fill';
    fill.style.width = `${Math.min(progress, 100)}%`;
    bar.appendChild(fill);
    thumb.appendChild(bar);
  }

  const info = document.createElement('div');
  info.className = 'video-card-info';

  const text = document.createElement('div');
  text.className = 'video-card-text';

  const titleEl = document.createElement('h3');
  titleEl.className = 'video-card-title';
  titleEl.textContent = title;

  const metaEl = document.createElement('p');
  metaEl.className = 'video-card-meta';
  metaEl.textContent = `${views} · ${uploadedAt}`;

  text.appendChild(titleEl);
  if (showChannelName) {
    const channelEl = document.createElement('p');
    channelEl.className = 'video-card-channel';
    channelEl.textContent = channelName;
    channelEl.style.cursor = 'pointer';
    channelEl.addEventListener('click', (e) => {
      e.stopPropagation();
      navigate(`/channel/${getChannelIdByName(channelName)}`);
    });
    text.appendChild(channelEl);
  }
  text.appendChild(metaEl);

  if (variant === 'default') {
    const avatar = document.createElement('div');
    avatar.className = 'video-card-avatar';
    avatar.style.cursor = 'pointer';
    if (channelAvatar) {
      const img = document.createElement('img');
      img.src = channelAvatar;
      img.alt = channelName;
      avatar.appendChild(img);
    } else {
      avatar.textContent = channelName.charAt(0).toUpperCase();
      avatar.style.background = hashColor(channelName);
    }
    avatar.addEventListener('click', (e) => {
      e.stopPropagation();
      navigate(`/channel/${getChannelIdByName(channelName)}`);
    });
    info.append(avatar, text);
  } else {
    info.append(text);
  }

  card.append(thumb, info);

  if (onClick) {
    card.addEventListener('click', onClick);
  }

  return card;
}

function createActionBtn(title: string, svgHTML: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'thumbnail-action-btn';
  btn.title = title;
  btn.innerHTML = svgHTML;
  btn.addEventListener('click', (e) => e.stopPropagation());
  return btn;
}
