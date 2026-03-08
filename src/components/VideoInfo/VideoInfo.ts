import './VideoInfo.css';
import { hashColor } from '../../utils/avatarColor';
import { getChannelIdByName } from '../../data/channelStore';
import { navigate } from '../../router/router';

export interface VideoInfoOptions {
  title: string;
  channelName: string;
  subscribers: string;
  views: string;
  publishedDate: string;
  likes: string;
  dislikes: string;
  description: string;
}

export function VideoInfo(options: VideoInfoOptions): HTMLDivElement {
  const { title, channelName, subscribers, views, publishedDate, likes, dislikes, description } = options;

  const container = document.createElement('div');
  container.className = 'video-info';

  // Title
  const titleEl = document.createElement('h1');
  titleEl.className = 'video-info-title';
  titleEl.textContent = title;

  // Channel row
  const channelRow = document.createElement('div');
  channelRow.className = 'video-info-channel';

  const channelLeft = document.createElement('div');
  channelLeft.className = 'video-info-channel-left';

  const channelId = getChannelIdByName(channelName);

  const avatar = document.createElement('div');
  avatar.className = 'video-info-avatar';
  avatar.textContent = channelName.charAt(0).toUpperCase();
  avatar.style.background = hashColor(channelName);
  avatar.style.cursor = 'pointer';
  avatar.addEventListener('click', () => navigate(`/channel/${channelId}`));

  const channelText = document.createElement('div');
  channelText.className = 'video-info-channel-text';

  const channelNameEl = document.createElement('span');
  channelNameEl.className = 'video-info-channel-name';
  channelNameEl.textContent = channelName;
  channelNameEl.style.cursor = 'pointer';
  channelNameEl.addEventListener('click', () => navigate(`/channel/${channelId}`));

  const subscribersEl = document.createElement('span');
  subscribersEl.className = 'video-info-subscribers';
  subscribersEl.textContent = subscribers;

  channelText.append(channelNameEl, subscribersEl);

  const subscribeBtn = document.createElement('button');
  subscribeBtn.className = 'video-info-subscribe';
  subscribeBtn.textContent = 'Suscribirse';

  const sponsorBtn = document.createElement('button');
  sponsorBtn.className = 'video-info-sponsor';
  sponsorBtn.textContent = '$ Patrocinar';

  channelLeft.append(avatar, channelText, subscribeBtn, sponsorBtn);

  // Actions (right side of channel row)
  const actionsRow = document.createElement('div');
  actionsRow.className = 'video-info-actions';

  const likeBtn = createActionBtn(
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
    </svg>`,
    likes,
  );

  const dislikeBtn = createActionBtn(
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 15V19a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
      <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
    </svg>`,
    dislikes,
  );

  const shareBtn = createActionBtn(
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>`,
    'Compartir',
  );

  const saveBtn = createActionBtn(
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>`,
    'Guardar',
  );

  const reportBtn = createActionBtn(
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
      <line x1="4" y1="22" x2="4" y2="15"/>
    </svg>`,
    'Reportar',
  );

  actionsRow.append(likeBtn, dislikeBtn, shareBtn, saveBtn, reportBtn);

  channelRow.append(channelLeft, actionsRow);

  // Description
  const descriptionBox = document.createElement('div');
  descriptionBox.className = 'video-info-description';

  const descMeta = document.createElement('p');
  descMeta.className = 'video-info-description-meta';
  descMeta.textContent = `${views} · ${publishedDate}`;

  const descText = document.createElement('p');
  descText.className = 'video-info-description-text video-info-description-text--collapsed';
  descText.textContent = description;

  const descToggle = document.createElement('span');
  descToggle.className = 'video-info-description-toggle';
  descToggle.textContent = 'Mostrar más';

  let isExpanded = false;
  descriptionBox.addEventListener('click', () => {
    isExpanded = !isExpanded;
    if (isExpanded) {
      descText.classList.remove('video-info-description-text--collapsed');
      descToggle.textContent = 'Mostrar menos';
    } else {
      descText.classList.add('video-info-description-text--collapsed');
      descToggle.textContent = 'Mostrar más';
    }
  });

  descriptionBox.append(descMeta, descText, descToggle);

  container.append(titleEl, channelRow, descriptionBox);

  return container;
}

function createActionBtn(svgHTML: string, label: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'video-info-action-btn';
  btn.innerHTML = svgHTML;
  const span = document.createElement('span');
  span.textContent = label;
  btn.appendChild(span);
  return btn;
}
