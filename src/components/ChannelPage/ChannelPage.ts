import './ChannelPage.css';
import { ChannelData, getVideosByChannel } from '../../data/channelStore';
import { ChannelTabs } from '../ChannelTabs/ChannelTabs';
import { VideoGrid } from '../VideoGrid/VideoGrid';
import { VideoCard } from '../VideoCard/VideoCard';
import { hashColor } from '../../utils/avatarColor';
import { navigate } from '../../router/router';
import { getAuthState, subscribe as subscribeAuth } from '../../data/authStore';
import { toggleSubscription, isSubscribed, getSubscriberCount } from '../../lib/subscriptions';
import { updateProfile, uploadAvatar, uploadBanner } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

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

function toHandleBase(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]+/g, '')
    .slice(0, 24) || 'canal';
}

function isLikelyUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function formatSubscriberCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M suscriptores`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K suscriptores`;
  if (n === 1) return '1 suscriptor';
  return `${n} suscriptores`;
}

export function ChannelPage(options: ChannelPageOptions): HTMLDivElement {
  const { channel, activeTab } = options;

  const page = document.createElement('div');
  page.className = 'channel-page';

  // Banner
  const banner = document.createElement('div');
  banner.className = 'channel-banner';
  const fallbackBanner = bannerGradients[channel.bannerGradientIndex % bannerGradients.length];
  banner.style.background = fallbackBanner;

  // Header
  const header = document.createElement('div');
  header.className = 'channel-header';

  const headerLeft = document.createElement('div');
  headerLeft.className = 'channel-header-left';

  const authSnapshot = getAuthState();
  const videos = getVideosByChannel(channel.id);
  const primaryVideo = videos[0];
  const channelUserId = primaryVideo?.userId || (isLikelyUuid(channel.id) ? channel.id : null);
  const isOwnChannel = !!(authSnapshot.isLoggedIn && channelUserId && authSnapshot.user?.id === channelUserId);
  const ownerProfile = isOwnChannel && authSnapshot.profile?.id === channelUserId
    ? authSnapshot.profile
    : null;

  let currentChannelName = ownerProfile?.display_name || primaryVideo?.channelName || channel.name;
  const channelUsername = ownerProfile?.username || primaryVideo?.channelUsername || toHandleBase(currentChannelName);
  const channelHandle = `@${channelUsername}`;
  let currentDescription = ownerProfile?.bio || channel.description || '';
  let currentAvatarUrl = ownerProfile?.avatar_url || primaryVideo?.channelAvatar || null;
  let currentBannerUrl = ownerProfile?.banner_url || null;

  const fallbackSubscribers = primaryVideo?.subscribers || channel.subscribers || '0 suscriptores';
  const channelVideoCount = videos.length;
  let subscriberCountValue: number | null = null;
  let isEditing = false;
  let pendingAvatarFile: File | null = null;
  let pendingBannerFile: File | null = null;
  let pendingAvatarPreviewUrl: string | null = null;
  let pendingBannerPreviewUrl: string | null = null;

  const avatar = document.createElement('div');
  avatar.className = 'channel-avatar';
  const applyAvatarFallback = () => {
    avatar.innerHTML = '';
    avatar.textContent = currentChannelName.charAt(0).toUpperCase();
    avatar.style.background = hashColor(currentChannelName);
  };

  const applyAvatarVisual = (avatarUrl: string | null) => {
    if (!avatarUrl) {
      applyAvatarFallback();
      return;
    }

    avatar.innerHTML = '';
    const img = document.createElement('img');
    img.src = avatarUrl;
    img.alt = currentChannelName;
    img.addEventListener('error', applyAvatarFallback);
    avatar.appendChild(img);
  };

  const applyBannerVisual = (bannerUrl: string | null) => {
    if (bannerUrl) {
      banner.style.background = '';
      banner.style.backgroundImage = `url("${bannerUrl}")`;
      banner.style.backgroundSize = 'cover';
      banner.style.backgroundPosition = 'center';
      banner.style.backgroundRepeat = 'no-repeat';
      return;
    }

    banner.style.backgroundImage = '';
    banner.style.backgroundSize = '';
    banner.style.backgroundPosition = '';
    banner.style.backgroundRepeat = '';
    banner.style.background = fallbackBanner;
  };

  const clearObjectUrl = (url: string | null) => {
    if (!url) return;
    URL.revokeObjectURL(url);
  };

  const avatarShell = document.createElement('div');
  avatarShell.className = 'channel-avatar-shell';

  const avatarInput = document.createElement('input');
  avatarInput.type = 'file';
  avatarInput.accept = 'image/*';
  avatarInput.className = 'channel-inline-file-input';

  const avatarEditBtn = document.createElement('button');
  avatarEditBtn.type = 'button';
  avatarEditBtn.className = 'channel-media-edit channel-avatar-edit';
  avatarEditBtn.textContent = 'Cambiar foto';

  avatarEditBtn.addEventListener('click', () => {
    if (!isEditing) return;
    avatarInput.click();
  });

  avatarInput.addEventListener('change', () => {
    const file = avatarInput.files?.[0];
    if (!file) return;

    pendingAvatarFile = file;
    clearObjectUrl(pendingAvatarPreviewUrl);
    pendingAvatarPreviewUrl = URL.createObjectURL(file);
    applyAvatarVisual(pendingAvatarPreviewUrl);
  });

  const bannerInput = document.createElement('input');
  bannerInput.type = 'file';
  bannerInput.accept = 'image/*';
  bannerInput.className = 'channel-inline-file-input';

  const bannerEditBtn = document.createElement('button');
  bannerEditBtn.type = 'button';
  bannerEditBtn.className = 'channel-media-edit channel-banner-edit';
  bannerEditBtn.textContent = 'Cambiar banner';

  bannerEditBtn.addEventListener('click', () => {
    if (!isEditing) return;
    bannerInput.click();
  });

  bannerInput.addEventListener('change', () => {
    const file = bannerInput.files?.[0];
    if (!file) return;

    pendingBannerFile = file;
    clearObjectUrl(pendingBannerPreviewUrl);
    pendingBannerPreviewUrl = URL.createObjectURL(file);
    applyBannerVisual(pendingBannerPreviewUrl);
  });

  applyAvatarVisual(currentAvatarUrl);
  applyBannerVisual(currentBannerUrl);

  avatarShell.append(avatar, avatarEditBtn, avatarInput);
  banner.append(bannerEditBtn, bannerInput);

  const headerText = document.createElement('div');
  headerText.className = 'channel-header-text';

  const name = document.createElement('h1');
  name.className = 'channel-name';
  name.textContent = currentChannelName;

  const handle = document.createElement('span');
  handle.className = 'channel-handle';
  handle.textContent = channelHandle;

  const counters = document.createElement('span');
  counters.className = 'channel-counters';
  counters.textContent = `${fallbackSubscribers} · ${channelVideoCount} videos`;

  const description = document.createElement('p');
  description.className = 'channel-description';
  description.textContent = currentDescription;

  const inlineEditor = document.createElement('div');
  inlineEditor.className = 'channel-inline-editor';

  const nameInput = document.createElement('input');
  nameInput.className = 'channel-inline-name-input';
  nameInput.type = 'text';
  nameInput.maxLength = 70;
  nameInput.value = currentChannelName;

  const handleStatic = document.createElement('div');
  handleStatic.className = 'channel-inline-handle';
  handleStatic.textContent = `${channelHandle} (no editable)`;

  const descriptionInput = document.createElement('textarea');
  descriptionInput.className = 'channel-inline-description-input';
  descriptionInput.rows = 4;
  descriptionInput.maxLength = 5000;
  descriptionInput.value = currentDescription;
  descriptionInput.placeholder = 'Agrega una descripcion para tu canal';

  const editorStatus = document.createElement('div');
  editorStatus.className = 'channel-inline-status';

  const editorActions = document.createElement('div');
  editorActions.className = 'channel-inline-actions';

  const cancelEditBtn = document.createElement('button');
  cancelEditBtn.type = 'button';
  cancelEditBtn.className = 'channel-inline-btn channel-inline-btn-ghost';
  cancelEditBtn.textContent = 'Cancelar';

  const saveEditBtn = document.createElement('button');
  saveEditBtn.type = 'button';
  saveEditBtn.className = 'channel-inline-btn channel-inline-btn-primary';
  saveEditBtn.textContent = 'Guardar cambios';

  editorActions.append(cancelEditBtn, saveEditBtn);
  inlineEditor.append(nameInput, handleStatic, descriptionInput, editorStatus, editorActions);

  headerText.append(name, handle, counters, description, inlineEditor);

  const subscribeBtn = document.createElement('button');
  subscribeBtn.className = 'channel-subscribe-btn';
  subscribeBtn.textContent = 'Suscribirse';

  const sponsorBtn = document.createElement('button');
  sponsorBtn.className = 'channel-sponsor-btn';
  sponsorBtn.textContent = '$ Patrocinar';

  const editChannelBtn = document.createElement('button');
  editChannelBtn.className = 'channel-edit-btn';
  editChannelBtn.textContent = 'Editar canal';
  let saveBusy = false;

  const setEditStatus = (message: string, isError = false) => {
    editorStatus.textContent = message;
    editorStatus.classList.toggle('error', isError);
    editorStatus.classList.toggle('visible', !!message);
  };

  const applyCurrentChannelUi = () => {
    name.textContent = currentChannelName;
    description.textContent = currentDescription;
    nameInput.value = currentChannelName;
    descriptionInput.value = currentDescription;
    channel.name = currentChannelName;
    channel.description = currentDescription;
    applyAvatarVisual(currentAvatarUrl);
    applyBannerVisual(currentBannerUrl);
  };

  const setEditingMode = (editing: boolean) => {
    isEditing = editing;
    page.classList.toggle('channel-is-editing', editing);
    inlineEditor.classList.toggle('visible', editing);
    name.style.display = editing ? 'none' : '';
    description.style.display = editing ? 'none' : '';
    counters.style.display = editing ? 'none' : '';
    editChannelBtn.style.display = isOwnChannel && !editing ? '' : 'none';
    avatarEditBtn.style.display = isOwnChannel && editing ? 'inline-flex' : 'none';
    bannerEditBtn.style.display = isOwnChannel && editing ? 'inline-flex' : 'none';
    if (!editing) {
      setEditStatus('');
    }
  };

  editChannelBtn.addEventListener('click', () => {
    if (!isOwnChannel) return;
    pendingAvatarFile = null;
    pendingBannerFile = null;
    avatarInput.value = '';
    bannerInput.value = '';
    clearObjectUrl(pendingAvatarPreviewUrl);
    clearObjectUrl(pendingBannerPreviewUrl);
    pendingAvatarPreviewUrl = null;
    pendingBannerPreviewUrl = null;
    applyCurrentChannelUi();
    setEditingMode(true);
  });

  cancelEditBtn.addEventListener('click', () => {
    pendingAvatarFile = null;
    pendingBannerFile = null;
    avatarInput.value = '';
    bannerInput.value = '';
    clearObjectUrl(pendingAvatarPreviewUrl);
    clearObjectUrl(pendingBannerPreviewUrl);
    pendingAvatarPreviewUrl = null;
    pendingBannerPreviewUrl = null;
    applyCurrentChannelUi();
    setEditingMode(false);
  });

  saveEditBtn.addEventListener('click', async () => {
    if (!isOwnChannel || !channelUserId || saveBusy) return;

    const nextName = nameInput.value.trim();
    if (!nextName) {
      setEditStatus('El nombre del canal es obligatorio.', true);
      return;
    }

    const nextDescription = descriptionInput.value.trim();
    saveBusy = true;
    saveEditBtn.disabled = true;
    saveEditBtn.textContent = 'Guardando...';
    cancelEditBtn.disabled = true;
    setEditStatus('');

    try {
      const updates: Record<string, string> = {};
      if (nextName !== currentChannelName) updates.display_name = nextName;
      if (nextDescription !== currentDescription) updates.bio = nextDescription;

      if (Object.keys(updates).length > 0) {
        const { error } = await updateProfile(channelUserId, updates as any);
        if (error) {
          throw new Error(error.message || 'No se pudo actualizar el perfil');
        }
      }

      if (pendingAvatarFile) {
        const { error, url } = await uploadAvatar(channelUserId, pendingAvatarFile);
        if (error) {
          throw new Error(error.message || 'No se pudo subir la foto de perfil');
        }
        if (url) currentAvatarUrl = url;
      }

      if (pendingBannerFile) {
        const { error, url } = await uploadBanner(channelUserId, pendingBannerFile);
        if (error) {
          throw new Error(error.message || 'No se pudo subir el banner');
        }
        if (url) currentBannerUrl = url;
      }

      currentChannelName = nextName;
      currentDescription = nextDescription;
      pendingAvatarFile = null;
      pendingBannerFile = null;
      avatarInput.value = '';
      bannerInput.value = '';
      clearObjectUrl(pendingAvatarPreviewUrl);
      clearObjectUrl(pendingBannerPreviewUrl);
      pendingAvatarPreviewUrl = null;
      pendingBannerPreviewUrl = null;
      applyCurrentChannelUi();
      setEditingMode(false);
    } catch (err) {
      setEditStatus(
        err instanceof Error ? err.message : 'No se pudieron guardar los cambios.',
        true,
      );
    } finally {
      saveBusy = false;
      saveEditBtn.disabled = false;
      saveEditBtn.textContent = 'Guardar cambios';
      cancelEditBtn.disabled = false;
    }
  });

  setEditingMode(false);

  headerLeft.append(avatarShell, headerText);
  header.appendChild(headerLeft);

  // Tabs row (tabs left, actions right)
  const tabs = ChannelTabs({ channelId: channel.id, activeTab });
  const tabsRow = document.createElement('div');
  tabsRow.className = 'channel-tabs-row';
  const tabsActions = document.createElement('div');
  tabsActions.className = 'channel-tabs-actions';
  tabsActions.append(subscribeBtn, sponsorBtn, editChannelBtn);
  tabsRow.append(tabs, tabsActions);

  const updateCounters = () => {
    const subscriberText = subscriberCountValue === null
      ? fallbackSubscribers
      : formatSubscriberCount(subscriberCountValue);
    counters.textContent = `${subscriberText} · ${channelVideoCount} videos`;
  };

  const setSubscribeVisualState = (subscribed: boolean) => {
    subscribeBtn.textContent = subscribed ? 'Desuscribirse' : 'Suscribirse';
    subscribeBtn.classList.toggle('subscribed', subscribed);
  };

  const refreshSubscriptionUi = async () => {
    const auth = getAuthState();
    const isOwnChannelNow = !!(auth.isLoggedIn && channelUserId && auth.user?.id === channelUserId);

    editChannelBtn.style.display = isOwnChannelNow && !isEditing ? '' : 'none';
    subscribeBtn.style.display = isOwnChannelNow ? 'none' : '';
    sponsorBtn.style.display = isOwnChannelNow ? 'none' : '';
    avatarEditBtn.style.display = isOwnChannelNow && isEditing ? 'inline-flex' : 'none';
    bannerEditBtn.style.display = isOwnChannelNow && isEditing ? 'inline-flex' : 'none';

    if (!channelUserId) {
      subscribeBtn.disabled = true;
      subscribeBtn.textContent = 'No disponible';
      return;
    }

    const count = await getSubscriberCount(channelUserId);
    subscriberCountValue = count;
    updateCounters();

    if (!auth.isLoggedIn) {
      subscribeBtn.disabled = false;
      setSubscribeVisualState(false);
      return;
    }

    const subscribed = await isSubscribed(channelUserId);
    setSubscribeVisualState(subscribed);
    subscribeBtn.disabled = false;
  };

  subscribeBtn.addEventListener('click', async () => {
    if (!channelUserId) return;
    if (!getAuthState().isLoggedIn) return;
    if (subscribeBtn.disabled) return;

    subscribeBtn.disabled = true;
    const wasSubscribed = subscribeBtn.classList.contains('subscribed');

    setSubscribeVisualState(!wasSubscribed);
    if (subscriberCountValue !== null) {
      subscriberCountValue += wasSubscribed ? -1 : 1;
      updateCounters();
    }

    const ok = await toggleSubscription(channelUserId);
    if (!ok) {
      setSubscribeVisualState(wasSubscribed);
      if (subscriberCountValue !== null) {
        subscriberCountValue += wasSubscribed ? 1 : -1;
        updateCounters();
      }
    } else {
      const count = await getSubscriberCount(channelUserId);
      subscriberCountValue = count;
      updateCounters();
    }

    subscribeBtn.disabled = false;
  });

  // Content
  const content = document.createElement('div');
  content.className = 'channel-content';

  switch (activeTab) {
    case 'videos':
      content.appendChild(renderVideosTab(channel, isOwnChannel));
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
      content.appendChild(renderVideosTab(channel, false));
  }

  page.append(banner, header, tabsRow, content);

  void refreshSubscriptionUi();
  const unsubscribeAuth = subscribeAuth(() => {
    void refreshSubscriptionUi();
  });

  let mounted = false;
  const cleanupObserver = new MutationObserver(() => {
    if (!mounted) {
      if (document.contains(page)) mounted = true;
      return;
    }
    if (!document.contains(page)) {
      unsubscribeAuth();
      cleanupObserver.disconnect();
    }
  });
  cleanupObserver.observe(document.body, { childList: true, subtree: true });

  return page;
}

function parseViewsToNumber(label: string): number {
  const normalized = label.toLowerCase().replace(/\s+/g, '');
  const match = normalized.match(/([\d.,]+)([mk])?/);
  if (!match) return 0;

  const raw = match[1].replace(/,/g, '.');
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return 0;

  const suffix = match[2];
  if (suffix === 'm') return Math.round(value * 1_000_000);
  if (suffix === 'k') return Math.round(value * 1_000);
  return Math.round(value);
}

function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

function normalizeForSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

type OwnerVideoFilter = 'all' | 'oldest' | 'featured' | 'private' | 'public' | 'sponsors' | 'unlisted' | 'draft';

type OwnerChannelVideo = (ReturnType<typeof getVideosByChannel>)[number] & {
  visibility?: string;
  audience?: string;
  status?: string;
  createdAt?: string;
};

function hashToGradientIndex(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % bannerGradients.length;
}

function formatViewsLabel(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M vistas`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K vistas`;
  return `${count} vista${count === 1 ? '' : 's'}`;
}

function formatUploadAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (!Number.isFinite(then)) return 'hace un momento';

  const diffMs = now - then;
  const diffMin = Math.max(0, Math.floor(diffMs / 60_000));
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffMin < 1) return 'hace un momento';
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffHour < 24) return `hace ${diffHour} hora${diffHour > 1 ? 's' : ''}`;
  if (diffDay < 7) return `hace ${diffDay} dia${diffDay > 1 ? 's' : ''}`;
  if (diffWeek < 5) return `hace ${diffWeek} semana${diffWeek > 1 ? 's' : ''}`;
  return `hace ${diffMonth} mes${diffMonth > 1 ? 'es' : ''}`;
}

function formatPublishedDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (!Number.isFinite(d.getTime())) return '';
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function parsePublishedDate(label: string): number | null {
  const normalized = normalizeForSearch(label);
  const match = normalized.match(/^(\d{1,2})\s+([a-z]{3})\s+(\d{4})$/);
  if (!match) return null;

  const months: Record<string, number> = {
    ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
    jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
  };
  const month = months[match[2]];
  if (month === undefined) return null;

  const day = Number.parseInt(match[1], 10);
  const year = Number.parseInt(match[3], 10);
  if (!Number.isFinite(day) || !Number.isFinite(year)) return null;
  return new Date(year, month, day).getTime();
}

function parseUploadedAgoToTimestamp(label: string): number | null {
  const normalized = normalizeForSearch(label).replace(/\s+/g, ' ').trim();
  const match = normalized.match(/^hace\s+(\d+)\s+(min|hora|horas|dia|dias|semana|semanas|mes|meses)$/);
  if (!match) return normalized === 'hace un momento' ? Date.now() : null;

  const amount = Number.parseInt(match[1], 10);
  if (!Number.isFinite(amount)) return null;

  let diffMs = 0;
  switch (match[2]) {
    case 'min':
      diffMs = amount * 60_000;
      break;
    case 'hora':
    case 'horas':
      diffMs = amount * 3_600_000;
      break;
    case 'dia':
    case 'dias':
      diffMs = amount * 86_400_000;
      break;
    case 'semana':
    case 'semanas':
      diffMs = amount * 604_800_000;
      break;
    case 'mes':
    case 'meses':
      diffMs = amount * 2_592_000_000;
      break;
    default:
      return null;
  }

  return Date.now() - diffMs;
}

function getVideoTimestamp(video: OwnerChannelVideo): number {
  if (video.createdAt) {
    const created = new Date(video.createdAt).getTime();
    if (Number.isFinite(created)) return created;
  }

  const fromPublished = parsePublishedDate(video.publishedDate);
  if (fromPublished !== null) return fromPublished;

  const fromUploaded = parseUploadedAgoToTimestamp(video.uploadedAt);
  if (fromUploaded !== null) return fromUploaded;

  return 0;
}

function isSponsorsOnly(video: OwnerChannelVideo): boolean {
  const audience = normalizeForSearch(video.audience || '');
  if (audience === 'sponsors' || audience === 'members' || audience === 'patrocinadores') {
    return true;
  }

  const tags = Array.isArray(video.tags) ? video.tags : [];
  return tags.some((tag) => normalizeForSearch(tag).includes('patrocin'));
}

function getFeaturedVideos(videos: OwnerChannelVideo[]): OwnerChannelVideo[] {
  if (videos.length <= 2) return [...videos];

  const sorted = [...videos].sort((a, b) => {
    const aScore = parseViewsToNumber(a.views) + ((Number.parseInt(a.likes, 10) || 0) * 20);
    const bScore = parseViewsToNumber(b.views) + ((Number.parseInt(b.likes, 10) || 0) * 20);
    return bScore - aScore;
  });
  const topCount = Math.max(1, Math.ceil(sorted.length * 0.35));
  return sorted.slice(0, topCount);
}

function applyOwnerFilter(videos: OwnerChannelVideo[], filter: OwnerVideoFilter): OwnerChannelVideo[] {
  switch (filter) {
    case 'oldest':
      return [...videos].sort((a, b) => getVideoTimestamp(a) - getVideoTimestamp(b));
    case 'featured':
      return getFeaturedVideos(videos);
    case 'private':
      return videos.filter((v) => v.visibility === 'private');
    case 'public':
      return videos.filter((v) => v.visibility === 'public');
    case 'sponsors':
      return videos.filter((v) => isSponsorsOnly(v));
    case 'unlisted':
      return videos.filter((v) => v.visibility === 'unlisted');
    case 'draft':
      return videos.filter((v) => v.status === 'draft');
    case 'all':
    default:
      return [...videos];
  }
}

async function fetchOwnerChannelVideos(channel: ChannelData, userId: string): Promise<OwnerChannelVideo[] | null> {
  const { data, error } = await supabase
    .from('user_videos')
    .select('id, title, video_url, thumbnail_url, view_count, created_at, likes, dislikes, tags, category, visibility, audience, status')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[ChannelPage] Failed to load owner videos:', error.message);
    return null;
  }

  if (!data || data.length === 0) return [];

  return data.map((row) => ({
    id: row.id,
    userId,
    title: row.title || 'Sin titulo',
    description: '',
    videoUrl: row.video_url || '',
    thumbnailUrl: row.thumbnail_url || '',
    channelName: channel.name,
    channelUsername: toHandleBase(channel.name),
    channelAvatar: '',
    views: formatViewsLabel(row.view_count ?? 0),
    uploadedAt: formatUploadAgo(row.created_at),
    duration: '',
    gradientIndex: hashToGradientIndex(row.id),
    subscribers: channel.subscribers || '0 suscriptores',
    likes: String(row.likes ?? 0),
    dislikes: String(row.dislikes ?? 0),
    publishedDate: formatPublishedDate(row.created_at),
    category: row.category || '',
    tags: row.tags || [],
    visibility: row.visibility || 'public',
    audience: row.audience || 'all',
    status: row.status || 'published',
    createdAt: row.created_at || undefined,
  }));
}

function renderVideosTab(channel: ChannelData, isOwnChannel: boolean): HTMLElement {
  const videos = getVideosByChannel(channel.id);

  if (videos.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'channel-empty';
    empty.textContent = 'Este canal no tiene videos todavÃ­a.';
    return empty;
  }

  const cardVideos = videos.map(v => ({
      thumbnail: v.thumbnailUrl || undefined,
      videoUrl: v.videoUrl,
      title: v.title,
      channelName: v.channelName,
      channelAvatar: v.channelAvatar || undefined,
      views: v.views,
      uploadedAt: v.uploadedAt,
      duration: v.duration,
      gradientIndex: v.gradientIndex,
      onClick: () => navigate(`/watch/${v.id}`),
  }));

  if (!isOwnChannel) {
    return VideoGrid({
      videos: cardVideos,
      columns: { default: 4, tablet: 3, mobile: 1 },
    });
  }

  const main = document.createElement('div');
  main.className = 'channel-owner-main';

  const controls = document.createElement('div');
  controls.className = 'channel-owner-controls';

  const searchWrap = document.createElement('div');
  searchWrap.className = 'channel-owner-search';
  const searchInput = document.createElement('input');
  searchInput.className = 'channel-owner-search-input';
  searchInput.type = 'search';
  searchInput.placeholder = 'Buscar videos de este canal';
  searchInput.setAttribute('aria-label', 'Buscar videos de este canal');
  searchWrap.appendChild(searchInput);

  const filterWrap = document.createElement('div');
  filterWrap.className = 'channel-owner-filter';
  const filterSelect = document.createElement('select');
  filterSelect.className = 'channel-owner-filter-select';
  filterSelect.setAttribute('aria-label', 'Filtrar videos del canal');
  const filterOptions: Array<{ value: OwnerVideoFilter; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'oldest', label: 'Mas antiguos' },
    { value: 'featured', label: 'Destacados' },
    { value: 'private', label: 'Privados' },
    { value: 'public', label: 'Publicos' },
    { value: 'sponsors', label: 'Para patrocinadores' },
    { value: 'unlisted', label: 'No listados' },
    { value: 'draft', label: 'Borradores' },
  ];
  filterOptions.forEach((optionData) => {
    const option = document.createElement('option');
    option.value = optionData.value;
    option.textContent = optionData.label;
    filterSelect.appendChild(option);
  });
  filterWrap.appendChild(filterSelect);

  controls.append(searchWrap, filterWrap);

  const list = document.createElement('div');
  list.className = 'channel-owner-video-list';

  let ownerVideos: OwnerChannelVideo[] = videos.map((video) => ({
    ...video,
    visibility: 'public',
    audience: 'all',
    status: 'published',
  }));
  let searchQuery = '';
  let selectedFilter: OwnerVideoFilter = 'all';

  const renderOwnerVideoList = (filteredVideos: OwnerChannelVideo[]) => {
    list.innerHTML = '';

    if (filteredVideos.length === 0) {
      const emptySearch = document.createElement('div');
      emptySearch.className = 'channel-owner-search-empty';
      emptySearch.textContent = 'No hay videos para el filtro seleccionado.';
      list.appendChild(emptySearch);
      return;
    }

    filteredVideos.forEach((video) => {
    const row = document.createElement('div');
    row.className = 'channel-owner-video-row';

    const card = VideoCard({
      thumbnail: video.thumbnailUrl || undefined,
      videoUrl: video.videoUrl,
      title: video.title,
      channelName: video.channelName,
      channelAvatar: video.channelAvatar || undefined,
      views: video.views,
      uploadedAt: video.uploadedAt,
      duration: video.duration,
      gradientIndex: video.gradientIndex,
      variant: 'owner',
      showChannelName: false,
      onClick: () => navigate(`/watch/${video.id}`),
    });

    const insights = document.createElement('div');
    insights.className = 'channel-owner-video-insights';

    const viewsCount = parseViewsToNumber(video.views);
    const likesCount = Number.parseInt(video.likes, 10) || 0;
    const monetizationReady = viewsCount >= 1_000;
    const likeRate = viewsCount > 0 ? Math.min(100, Math.round((likesCount / viewsCount) * 100)) : 0;

    insights.innerHTML = `
      <div class="channel-owner-card">
        <h4>Rendimiento</h4>
        <div class="channel-owner-metric"><span>Vistas</span><strong>${formatCompactNumber(viewsCount)}</strong></div>
        <div class="channel-owner-metric"><span>Likes</span><strong>${formatCompactNumber(likesCount)}</strong></div>
        <div class="channel-owner-metric"><span>Tasa likes</span><strong>${likeRate}%</strong></div>
      </div>
      <div class="channel-owner-card">
        <h4>Monetizacion</h4>
        <p class="channel-owner-card-main">${monetizationReady ? 'Activa' : 'En revision'}</p>
        <p class="channel-owner-card-sub">${monetizationReady ? 'Este video puede monetizar.' : 'Necesita mas vistas para monetizar mejor.'}</p>
      </div>
    `;

    row.append(card, insights);
    list.appendChild(row);
    });
  };

  const getFilteredVideos = (): OwnerChannelVideo[] => {
    const searched = searchQuery
      ? ownerVideos.filter((video) => normalizeForSearch(video.title).includes(searchQuery))
      : [...ownerVideos];

    return applyOwnerFilter(searched, selectedFilter);
  };

  const updateOwnerVideoList = () => {
    renderOwnerVideoList(getFilteredVideos());
  };

  updateOwnerVideoList();

  searchInput.addEventListener('input', () => {
    searchQuery = normalizeForSearch(searchInput.value.trim());
    updateOwnerVideoList();
  });

  filterSelect.addEventListener('change', () => {
    selectedFilter = (filterSelect.value as OwnerVideoFilter);
    updateOwnerVideoList();
  });

  if (isOwnChannel && getAuthState().user?.id) {
    const userId = getAuthState().user!.id;
    void fetchOwnerChannelVideos(channel, userId).then((loadedVideos) => {
      if (!loadedVideos || loadedVideos.length === 0) return;
      ownerVideos = loadedVideos;
      updateOwnerVideoList();
    });
  }

  main.append(controls, list);
  return main;
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
  descTitle.textContent = 'DescripciÃ³n';

  const descText = document.createElement('p');
  descText.className = 'channel-about-description';
  descText.textContent = channel.description;

  left.append(descTitle, descText);

  // Right: stats + links
  const right = document.createElement('div');
  right.className = 'channel-about-right';

  const statsTitle = document.createElement('h3');
  statsTitle.className = 'channel-about-section-title';
  statsTitle.textContent = 'EstadÃ­sticas';

  const statsList = document.createElement('div');
  statsList.className = 'channel-about-stats';

  const stats = [
    { label: 'Se uniÃ³', value: channel.joinedDate },
    { label: 'Vistas totales', value: channel.totalViews },
    { label: 'UbicaciÃ³n', value: channel.location },
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


