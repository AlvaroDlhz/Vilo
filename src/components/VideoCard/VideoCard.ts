import './VideoCard.css';
import { hashColor } from '../../utils/avatarColor';
import { getChannelIdByName } from '../../data/channelStore';
import { navigate } from '../../router/router';

export interface VideoCardOptions {
  thumbnail?: string;
  title: string;
  channelName: string;
  channelAvatar?: string;
  views: string;
  uploadedAt: string;
  duration?: string;
  progress?: number;
  gradientIndex?: number;
  variant?: 'default' | 'compact';
  onClick?: () => void;
}

const gradientClasses = [
  'gradient-1', 'gradient-2', 'gradient-3', 'gradient-4',
  'gradient-5', 'gradient-6', 'gradient-7', 'gradient-8',
];

export function VideoCard(options: VideoCardOptions): HTMLDivElement {
  const {
    thumbnail, title, channelName, channelAvatar, views,
    uploadedAt, duration, progress, gradientIndex = 0, variant = 'default', onClick,
  } = options;

  const isCompact = variant === 'compact';

  // ── Card ──
  const card = document.createElement('div');
  card.className = isCompact ? 'video-card video-card--compact' : 'video-card';

  // ── Thumbnail ──
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
  }

  // Action buttons (appear on hover)
  const actions = document.createElement('div');
  actions.className = 'thumbnail-actions';

  const watchLater = createActionBtn('Ver más tarde', `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  `);

  const menuBtn = createActionBtn('Más opciones', `
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="6" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="18" r="1.5"/>
    </svg>
  `);

  actions.append(watchLater, menuBtn);
  thumb.appendChild(actions);

  // Duration badge
  if (duration) {
    const dur = document.createElement('span');
    dur.className = 'video-card-duration';
    dur.textContent = duration;
    thumb.appendChild(dur);
  }

  // Progress bar
  if (progress !== undefined && progress > 0) {
    const bar = document.createElement('div');
    bar.className = 'video-card-progress';
    const fill = document.createElement('div');
    fill.className = 'video-card-progress-fill';
    fill.style.width = `${Math.min(progress, 100)}%`;
    bar.appendChild(fill);
    thumb.appendChild(bar);
  }

  // ── Info ──
  const info = document.createElement('div');
  info.className = 'video-card-info';

  // Text block
  const text = document.createElement('div');
  text.className = 'video-card-text';

  const titleEl = document.createElement('h3');
  titleEl.className = 'video-card-title';
  titleEl.textContent = title;

  const channelEl = document.createElement('p');
  channelEl.className = 'video-card-channel';
  channelEl.textContent = channelName;
  channelEl.style.cursor = 'pointer';
  channelEl.addEventListener('click', (e) => {
    e.stopPropagation();
    navigate(`/channel/${getChannelIdByName(channelName)}`);
  });

  const metaEl = document.createElement('p');
  metaEl.className = 'video-card-meta';
  metaEl.textContent = `${views} \u00B7 ${uploadedAt}`;

  text.append(titleEl, channelEl, metaEl);

  if (!isCompact) {
    // Avatar (only in default variant)
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

  // ── Assemble ──
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
