import './ChannelPage.css';
import { ChannelData, getVideosByChannel } from '../../data/channelStore';
import { ChannelTabs } from '../ChannelTabs/ChannelTabs';
import { VideoGrid } from '../VideoGrid/VideoGrid';
import { hashColor } from '../../utils/avatarColor';
import { navigate } from '../../router/router';

export interface ChannelPageOptions {
  channel: ChannelData;
  activeTab: string;
}

const bannerGradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
];

export function ChannelPage(options: ChannelPageOptions): HTMLDivElement {
  const { channel, activeTab } = options;

  const page = document.createElement('div');
  page.className = 'channel-page';

  // Banner
  const banner = document.createElement('div');
  banner.className = 'channel-banner';
  banner.style.background = bannerGradients[channel.bannerGradientIndex % bannerGradients.length];

  // Header
  const header = document.createElement('div');
  header.className = 'channel-header';

  const headerLeft = document.createElement('div');
  headerLeft.className = 'channel-header-left';

  const avatar = document.createElement('div');
  avatar.className = 'channel-avatar';
  avatar.textContent = channel.name.charAt(0).toUpperCase();
  avatar.style.background = hashColor(channel.name);

  const headerText = document.createElement('div');
  headerText.className = 'channel-header-text';

  const name = document.createElement('h1');
  name.className = 'channel-name';
  name.textContent = channel.name;

  const meta = document.createElement('span');
  meta.className = 'channel-meta';
  const videos = getVideosByChannel(channel.id);
  const handle = '@' + channel.id;
  meta.textContent = `${handle} · ${channel.subscribers} · ${videos.length} videos`;

  headerText.append(name, meta);

  const subscribeBtn = document.createElement('button');
  subscribeBtn.className = 'channel-subscribe-btn';
  subscribeBtn.textContent = 'Suscribirse';

  const sponsorBtn = document.createElement('button');
  sponsorBtn.className = 'channel-sponsor-btn';
  sponsorBtn.textContent = '$ Patrocinar';

  headerLeft.append(avatar, headerText, subscribeBtn, sponsorBtn);
  header.appendChild(headerLeft);

  // Tabs
  const tabs = ChannelTabs({ channelId: channel.id, activeTab });

  // Content
  const content = document.createElement('div');
  content.className = 'channel-content';

  switch (activeTab) {
    case 'videos':
      content.appendChild(renderVideosTab(channel));
      break;
    case 'playlists':
      content.appendChild(renderPlaylistsTab(channel));
      break;
    case 'community':
      content.appendChild(renderCommunityTab(channel));
      break;
    case 'about':
      content.appendChild(renderAboutTab(channel));
      break;
    default:
      content.appendChild(renderVideosTab(channel));
  }

  page.append(banner, header, tabs, content);
  return page;
}

function renderVideosTab(channel: ChannelData): HTMLElement {
  const videos = getVideosByChannel(channel.id);

  if (videos.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'channel-empty';
    empty.textContent = 'Este canal no tiene videos todavía.';
    return empty;
  }

  return VideoGrid({
    videos: videos.map(v => ({
      title: v.title,
      channelName: v.channelName,
      views: v.views,
      uploadedAt: v.uploadedAt,
      duration: v.duration,
      gradientIndex: v.gradientIndex,
      onClick: () => navigate(`/watch/${v.id}`),
    })),
    columns: { default: 4, tablet: 3, mobile: 1 },
  });
}

function renderPlaylistsTab(channel: ChannelData): HTMLElement {
  const grid = document.createElement('div');
  grid.className = 'channel-playlists-grid';

  channel.playlists.forEach(pl => {
    const card = document.createElement('div');
    card.className = 'playlist-card';

    const thumb = document.createElement('div');
    thumb.className = 'playlist-card-thumb';
    thumb.style.background = bannerGradients[pl.gradientIndex % bannerGradients.length];

    const overlay = document.createElement('div');
    overlay.className = 'playlist-card-overlay';

    const countIcon = document.createElement('span');
    countIcon.className = 'playlist-card-count';
    countIcon.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
        <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zm-7-1l5-4-5-4v8z"/>
      </svg>
      ${pl.videoCount} videos
    `;

    overlay.appendChild(countIcon);
    thumb.appendChild(overlay);

    const title = document.createElement('p');
    title.className = 'playlist-card-title';
    title.textContent = pl.title;

    const subtitle = document.createElement('p');
    subtitle.className = 'playlist-card-subtitle';
    subtitle.textContent = 'Ver playlist completa';

    card.append(thumb, title, subtitle);
    grid.appendChild(card);
  });

  return grid;
}

function renderCommunityTab(channel: ChannelData): HTMLElement {
  const list = document.createElement('div');
  list.className = 'channel-community';

  channel.posts.forEach(post => {
    const postEl = document.createElement('div');
    postEl.className = 'community-post';

    const postAvatar = document.createElement('div');
    postAvatar.className = 'community-post-avatar';
    postAvatar.textContent = channel.name.charAt(0).toUpperCase();
    postAvatar.style.background = hashColor(channel.name);

    const postBody = document.createElement('div');
    postBody.className = 'community-post-body';

    const postHeader = document.createElement('div');
    postHeader.className = 'community-post-header';

    const postName = document.createElement('span');
    postName.className = 'community-post-name';
    postName.textContent = channel.name;

    const postDate = document.createElement('span');
    postDate.className = 'community-post-date';
    postDate.textContent = post.date;

    postHeader.append(postName, postDate);

    const postText = document.createElement('p');
    postText.className = 'community-post-text';
    postText.textContent = post.text;

    const postActions = document.createElement('div');
    postActions.className = 'community-post-actions';

    const likeBtn = document.createElement('button');
    likeBtn.className = 'community-post-action';
    likeBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
        <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
      </svg>
    `;

    const commentBtn = document.createElement('button');
    commentBtn.className = 'community-post-action';
    commentBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    `;

    postActions.append(likeBtn, commentBtn);
    postBody.append(postHeader, postText, postActions);
    postEl.append(postAvatar, postBody);
    list.appendChild(postEl);
  });

  return list;
}

function renderAboutTab(channel: ChannelData): HTMLElement {
  const about = document.createElement('div');
  about.className = 'channel-about';

  // Left: description
  const left = document.createElement('div');
  left.className = 'channel-about-left';

  const descTitle = document.createElement('h3');
  descTitle.className = 'channel-about-section-title';
  descTitle.textContent = 'Descripción';

  const descText = document.createElement('p');
  descText.className = 'channel-about-description';
  descText.textContent = channel.description;

  left.append(descTitle, descText);

  // Right: stats + links
  const right = document.createElement('div');
  right.className = 'channel-about-right';

  const statsTitle = document.createElement('h3');
  statsTitle.className = 'channel-about-section-title';
  statsTitle.textContent = 'Estadísticas';

  const statsList = document.createElement('div');
  statsList.className = 'channel-about-stats';

  const stats = [
    { label: 'Se unió', value: channel.joinedDate },
    { label: 'Vistas totales', value: channel.totalViews },
    { label: 'Ubicación', value: channel.location },
  ];

  stats.forEach(stat => {
    const row = document.createElement('div');
    row.className = 'channel-about-stat';

    const label = document.createElement('span');
    label.className = 'channel-about-stat-label';
    label.textContent = stat.label;

    const value = document.createElement('span');
    value.className = 'channel-about-stat-value';
    value.textContent = stat.value;

    row.append(label, value);
    statsList.appendChild(row);
  });

  const linksTitle = document.createElement('h3');
  linksTitle.className = 'channel-about-section-title';
  linksTitle.textContent = 'Enlaces';

  const linksList = document.createElement('div');
  linksList.className = 'channel-about-links';

  channel.links.forEach(link => {
    const a = document.createElement('a');
    a.className = 'channel-about-link';
    a.href = link.url;
    a.textContent = link.label;
    linksList.appendChild(a);
  });

  right.append(statsTitle, statsList, linksTitle, linksList);
  about.append(left, right);

  return about;
}
