import './WatchPage.css';
import { VideoPlayer } from '../VideoPlayer/VideoPlayer';
import { VideoInfo } from '../VideoInfo/VideoInfo';
import { VideoCard } from '../VideoCard/VideoCard';
import { VideoData, getRecommendedVideos } from '../../data/videoStore';
import { navigate } from '../../router/router';
import { hashColor } from '../../utils/avatarColor';
import { getAuthState, subscribe } from '../../data/authStore';
import { fetchCommentsWithVotes, postComment, voteComment, deleteComment, fetchReplies, type Comment } from '../../lib/comments';
import { incrementViews } from '../../lib/videoInteractions';
import { toggleVideoInList } from '../../data/savedStore';
import menuIcon from '../../assets/menu.svg';
import { captureRandomFrameAsDataUrl } from '../../utils/videoThumbnail';

export interface WatchPageOptions {
  video: VideoData;
  queue?: {
    listId: string;
    listName: string;
    videos: VideoData[];
  };
}

const queueDurationCache = new Map<string, string>();
const queueDurationPending = new Map<string, Promise<string | null>>();
const queueGeneratedThumbCache = new Map<string, Promise<string | null>>();

function formatDurationFromSeconds(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function normalizeDurationLabel(raw: unknown): string {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return formatDurationFromSeconds(raw);
  }

  if (typeof raw !== 'string') return '';
  const value = raw.trim();
  if (!value) return '';

  if (/^\d+$/.test(value)) {
    return formatDurationFromSeconds(Number(value));
  }

  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) {
    return value;
  }

  return '';
}

async function resolveQueueDuration(video: VideoData): Promise<string | null> {
  const fromData = normalizeDurationLabel(video.duration);
  if (fromData) {
    queueDurationCache.set(video.id, fromData);
    return fromData;
  }

  const cached = queueDurationCache.get(video.id);
  if (cached) return cached;

  if (!video.videoUrl) return null;

  const pending = queueDurationPending.get(video.id);
  if (pending) return pending;

  const task = new Promise<string | null>((resolve) => {
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.src = video.videoUrl;
    probe.muted = true;

    const cleanup = () => {
      probe.onloadedmetadata = null;
      probe.onerror = null;
      probe.removeAttribute('src');
      probe.load();
    };

    probe.onloadedmetadata = () => {
      const label = Number.isFinite(probe.duration) ? formatDurationFromSeconds(probe.duration) : '';
      cleanup();
      resolve(label || null);
    };

    probe.onerror = () => {
      cleanup();
      resolve(null);
    };

    probe.load();
  });

  queueDurationPending.set(video.id, task);
  const resolved = await task;
  queueDurationPending.delete(video.id);

  if (resolved) {
    queueDurationCache.set(video.id, resolved);
  }

  return resolved;
}

function getQueueGeneratedThumbnail(videoUrl: string): Promise<string | null> {
  const cached = queueGeneratedThumbCache.get(videoUrl);
  if (cached) return cached;

  const generation = captureRandomFrameAsDataUrl(videoUrl).catch(() => null);
  queueGeneratedThumbCache.set(videoUrl, generation);
  return generation;
}

async function applyQueueGeneratedThumbnail(
  container: HTMLSpanElement,
  videoUrl: string,
  title: string,
): Promise<void> {
  const frame = await getQueueGeneratedThumbnail(videoUrl);
  if (!frame || !container.isConnected) return;
  if (container.querySelector('img')) return;

  const img = document.createElement('img');
  img.src = frame;
  img.alt = title;
  container.prepend(img);
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'hace un momento';
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return `hace ${m} minuto${m > 1 ? 's' : ''}`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return `hace ${h} hora${h > 1 ? 's' : ''}`;
  }
  if (diff < 2592000) {
    const d = Math.floor(diff / 86400);
    return `hace ${d} día${d > 1 ? 's' : ''}`;
  }
  if (diff < 31536000) {
    const mo = Math.floor(diff / 2592000);
    return `hace ${mo} mes${mo > 1 ? 'es' : ''}`;
  }
  const y = Math.floor(diff / 31536000);
  return `hace ${y} año${y > 1 ? 's' : ''}`;
}

export function WatchPage(options: WatchPageOptions): HTMLDivElement {
  const { video, queue } = options;
  const isPlaylistPlayback = !!queue;
  let cleanupQueueMenus: (() => void) | null = null;
  const queueVideos = queue?.videos || [];
  const queueListId = queue?.listId || '';
  const queueOrderStorageKey = queueListId ? `vilo_queue_order:${queueListId}` : '';

  function withSavedQueueOrder(videos: VideoData[]): VideoData[] {
    if (!queueOrderStorageKey || videos.length <= 1) return [...videos];
    const raw = sessionStorage.getItem(queueOrderStorageKey);
    if (!raw) return [...videos];

    try {
      const orderedIds = JSON.parse(raw) as unknown;
      if (!Array.isArray(orderedIds)) return [...videos];

      const byId = new Map(videos.map((item) => [item.id, item]));
      const ordered: VideoData[] = [];

      orderedIds.forEach((id) => {
        if (typeof id !== 'string') return;
        const match = byId.get(id);
        if (!match) return;
        ordered.push(match);
        byId.delete(id);
      });

      videos.forEach((item) => {
        if (byId.has(item.id)) ordered.push(item);
      });

      return ordered.length ? ordered : [...videos];
    } catch {
      return [...videos];
    }
  }

  let orderedQueueVideos = withSavedQueueOrder(queueVideos);

  function persistQueueOrder() {
    if (!queueOrderStorageKey) return;
    sessionStorage.setItem(
      queueOrderStorageKey,
      JSON.stringify(orderedQueueVideos.map((item) => item.id)),
    );
  }

  if (queueOrderStorageKey && orderedQueueVideos.length > 0) {
    persistQueueOrder();
  }

  function getNextVideoInQueue(): VideoData | undefined {
    const currentIndex = orderedQueueVideos.findIndex((queueVideo) => queueVideo.id === video.id);
    if (currentIndex < 0) return undefined;
    return orderedQueueVideos[currentIndex + 1];
  }

  const page = document.createElement('div');
  page.className = 'watch-page';

  // Primary column: player + info + recommended
  const primary = document.createElement('div');
  primary.className = 'watch-page-primary';

  const player = VideoPlayer({
    videoUrl: video.videoUrl,
    gradientIndex: video.gradientIndex,
    duration: video.duration,
    onEnded: () => {
      const nextQueueVideo = getNextVideoInQueue();
      if (!nextQueueVideo) return;
      const route = queueListId
        ? `/watch/${nextQueueVideo.id}/playlist/${queueListId}`
        : `/watch/${nextQueueVideo.id}`;
      navigate(route);
    },
  });

  const info = VideoInfo({
    title: video.title,
    channelName: video.channelName,
    channelAvatar: video.channelAvatar,
    subscribers: video.subscribers,
    views: video.views,
    publishedDate: video.publishedDate,
    likes: video.likes,
    dislikes: video.dislikes,
    description: video.description,
    videoId: video.id,
    channelUserId: video.userId,
  });

  // Increment view count once on page load
  incrementViews(video.id);

  // Recommended videos (below description)
  const recSection = document.createElement('div');
  recSection.className = 'watch-page-recommendations-section';

  const recHeading = document.createElement('h3');
  recHeading.className = 'watch-page-section-title';
  recHeading.textContent = 'Siguientes';

  const recommendations = document.createElement('div');
  recommendations.className = 'watch-page-recommendations';

  const recommended = getRecommendedVideos(video.id, 15);
  recommended.forEach(rec => {
    const card = VideoCard({
      thumbnail: rec.thumbnailUrl || undefined,
      videoUrl: rec.videoUrl,
      title: rec.title,
      channelName: rec.channelName,
      channelAvatar: rec.channelAvatar || undefined,
      views: rec.views,
      uploadedAt: rec.uploadedAt,
      duration: rec.duration,
      gradientIndex: rec.gradientIndex,
      variant: 'default',
      onClick: () => navigate(`/watch/${rec.id}`),
      onSaveClick: () => toggleVideoInList(rec.id),
    });
    recommendations.appendChild(card);
  });

  recSection.append(recHeading, recommendations);
  primary.append(player, info, recSection);

  // Secondary column: comments + queue tabs
  const secondary = document.createElement('div');
  secondary.className = 'watch-page-secondary';

  const commentsPanel = document.createElement('div');
  commentsPanel.className = 'watch-page-secondary-panel';

  const commentsHeader = document.createElement('div');
  commentsHeader.className = 'comments-header';

  const commentsTitle = document.createElement('h3');
  commentsTitle.className = 'watch-page-section-title';
  commentsTitle.textContent = '0 comentarios';

  const sortButtons = document.createElement('div');
  sortButtons.className = 'comments-sort-buttons';

  // State
  let comments: Comment[] = [];
  let userVotes = new Map<string, number>();
  let currentSort: 'recent' | 'popular' | 'oldest' = 'recent';
  let commentsLoading = false;
  let commentsError: string | null = null;

  type SortFn = (a: Comment, b: Comment) => number;
  const sortFns: Record<string, SortFn> = {
    recent: (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    popular: (a, b) => b.likes - a.likes,
    oldest: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  };

  // Comment search
  const commentSearch = document.createElement('div');
  commentSearch.className = 'comment-search';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'comment-search-field';
  searchInput.placeholder = 'Buscar comentarios...';

  commentSearch.appendChild(searchInput);

  function getFilteredComments(): Comment[] {
    const query = searchInput.value.toLowerCase().trim();
    let filtered = query
      ? comments.filter(c => {
          const author = c.profile?.display_name || '';
          return author.toLowerCase().includes(query) || c.text.toLowerCase().includes(query);
        })
      : [...comments];
    filtered.sort(sortFns[currentSort]);
    return filtered;
  }

  function updateCommentsTitle() {
    if (commentsLoading) {
      commentsTitle.textContent = 'Cargando comentarios...';
      return;
    }
    if (commentsError) {
      commentsTitle.textContent = 'Comentarios';
      return;
    }
    commentsTitle.textContent = `${comments.length} comentario${comments.length !== 1 ? 's' : ''}`;
  }

  // Comment list
  const commentList = document.createElement('div');
  commentList.className = 'comment-list';

  function buildCommentEl(c: Comment, isReply: boolean): HTMLDivElement {
    const comment = document.createElement('div');
    comment.className = 'comment';

    const avatar = document.createElement('div');
    avatar.className = 'comment-avatar';
    const authorName = c.profile?.display_name || 'Usuario';
    const channelRouteId = (c.user_id || c.profile?.username || '').trim();
    const canNavigateToChannel = channelRouteId.length > 0;

    const bindChannelNavigation = (el: HTMLElement) => {
      if (!canNavigateToChannel) return;
      const goToChannel = () => navigate(`/channel/${channelRouteId}`);

      el.classList.add('comment-channel-link');
      el.setAttribute('role', 'link');
      el.tabIndex = 0;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        goToChannel();
      });
      el.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        goToChannel();
      });
    };

    if (c.profile?.avatar_url) {
      const img = document.createElement('img');
      img.src = c.profile.avatar_url;
      img.alt = authorName;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.borderRadius = '50%';
      img.style.objectFit = 'cover';
      avatar.appendChild(img);
    } else {
      avatar.textContent = authorName.charAt(0).toUpperCase();
      avatar.style.background = hashColor(authorName);
    }

    const body = document.createElement('div');
    body.className = 'comment-body';

    const header = document.createElement('div');
    header.className = 'comment-meta';

    const authorEl = document.createElement('span');
    authorEl.className = 'comment-author';
    authorEl.textContent = authorName;

    const usernameEl = document.createElement('span');
    usernameEl.className = 'comment-username';
    usernameEl.textContent = c.profile?.username ? `@${c.profile.username}` : '';

    const timeEl = document.createElement('span');
    timeEl.className = 'comment-time';
    timeEl.textContent = timeAgo(c.created_at);

    header.append(authorEl, usernameEl, timeEl);
    if (canNavigateToChannel) {
      avatar.classList.add('comment-avatar--clickable');
    }
    bindChannelNavigation(avatar);
    bindChannelNavigation(authorEl);
    if (usernameEl.textContent) {
      bindChannelNavigation(usernameEl);
    }

    const textEl = document.createElement('p');
    textEl.className = 'comment-text';
    textEl.textContent = c.text;

    const actions = document.createElement('div');
    actions.className = 'comment-actions';

    const userVote = userVotes.get(c.id);

    const likeBtn = document.createElement('button');
    likeBtn.className = 'comment-action-btn' + (userVote === 1 ? ' active' : '');
    likeBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
        <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
      </svg>
      <span>${c.likes}</span>
    `;

    const dislikeBtn = document.createElement('button');
    dislikeBtn.className = 'comment-action-btn' + (userVote === -1 ? ' active' : '');
    dislikeBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
        <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
      </svg>
      <span>${c.dislikes}</span>
    `;

    likeBtn.addEventListener('click', () => {
      if (!getAuthState().isLoggedIn) return;
      const prevVote = userVotes.get(c.id) ?? null;
      const likeSpan = likeBtn.querySelector('span');
      const dislikeSpan = dislikeBtn.querySelector('span');

      if (prevVote === 1) {
        c.likes--;
        userVotes.delete(c.id);
        likeBtn.classList.remove('active');
      } else {
        if (prevVote === -1) { c.dislikes--; dislikeBtn.classList.remove('active'); }
        c.likes++;
        userVotes.set(c.id, 1);
        likeBtn.classList.add('active');
      }
      if (likeSpan) likeSpan.textContent = String(c.likes);
      if (dislikeSpan) dislikeSpan.textContent = String(c.dislikes);

      voteComment(c.id, 1);
    });

    dislikeBtn.addEventListener('click', () => {
      if (!getAuthState().isLoggedIn) return;
      const prevVote = userVotes.get(c.id) ?? null;
      const likeSpan = likeBtn.querySelector('span');
      const dislikeSpan = dislikeBtn.querySelector('span');

      if (prevVote === -1) {
        c.dislikes--;
        userVotes.delete(c.id);
        dislikeBtn.classList.remove('active');
      } else {
        if (prevVote === 1) { c.likes--; likeBtn.classList.remove('active'); }
        c.dislikes++;
        userVotes.set(c.id, -1);
        dislikeBtn.classList.add('active');
      }
      if (likeSpan) likeSpan.textContent = String(c.likes);
      if (dislikeSpan) dislikeSpan.textContent = String(c.dislikes);

      voteComment(c.id, -1);
    });

    actions.append(likeBtn, dislikeBtn);

    // Reply button only for top-level comments
    if (!isReply) {
      const replyBtn = document.createElement('button');
      replyBtn.className = 'comment-action-btn';
      replyBtn.textContent = 'Responder';
      replyBtn.addEventListener('click', () => {
        if (!getAuthState().isLoggedIn) return;
        // Toggle reply input
        const existing = comment.parentElement?.querySelector(`.comment-reply-input[data-parent="${c.id}"]`);
        if (existing) {
          existing.remove();
          return;
        }
        const replyInput = buildReplyInput(c.id);
        // Insert after this comment element (before replies container if exists)
        comment.after(replyInput);
        (replyInput.querySelector('input') as HTMLInputElement)?.focus();
      });
      actions.appendChild(replyBtn);
    }

    // Delete button for own comments
    if (getAuthState().isLoggedIn && getAuthState().user?.id === c.user_id) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'comment-action-btn comment-delete-btn';
      deleteBtn.textContent = 'Eliminar';
      deleteBtn.addEventListener('click', async () => {
        const ok = await deleteComment(c.id);
        if (ok) await refreshComments();
      });
      actions.appendChild(deleteBtn);
    }

    body.append(header, textEl, actions);
    comment.append(avatar, body);
    return comment;
  }

  function buildReplyInput(parentId: string): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'comment-reply-input';
    wrapper.dataset.parent = parentId;

    const replyAvatar = document.createElement('div');
    replyAvatar.className = 'comment-avatar';

    const auth = getAuthState();
    if (auth.profile?.avatar_url) {
      const img = document.createElement('img');
      img.src = auth.profile.avatar_url;
      img.alt = auth.profile.display_name;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.borderRadius = '50%';
      img.style.objectFit = 'cover';
      replyAvatar.appendChild(img);
      replyAvatar.style.background = 'none';
    } else {
      const name = auth.profile?.display_name || 'U';
      replyAvatar.textContent = name.charAt(0).toUpperCase();
      replyAvatar.style.background = hashColor(name);
    }

    const replyField = document.createElement('input');
    replyField.type = 'text';
    replyField.className = 'comment-input-field';
    replyField.placeholder = 'Añade una respuesta...';

    replyField.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && replyField.value.trim()) {
        const text = replyField.value.trim();
        replyField.value = '';
        replyField.disabled = true;
        const newReply = await postComment(video.id, text, parentId);
        replyField.disabled = false;
        if (newReply) {
          wrapper.remove();
          await refreshComments();
        }
        replyField.focus();
      } else if (e.key === 'Escape') {
        wrapper.remove();
      }
    });

    wrapper.append(replyAvatar, replyField);
    return wrapper;
  }

  function renderComments() {
    commentList.innerHTML = '';

    if (commentsLoading) {
      const loading = document.createElement('p');
      loading.className = 'comments-empty';
      loading.textContent = 'Cargando comentarios...';
      commentList.appendChild(loading);
      return;
    }

    if (commentsError) {
      const error = document.createElement('p');
      error.className = 'comments-empty';
      error.textContent = 'No se pudieron cargar los comentarios. Intenta recargar.';
      commentList.appendChild(error);
      return;
    }

    const list = getFilteredComments();

    list.forEach(c => {
      const commentWrapper = document.createElement('div');
      commentWrapper.className = 'comment-thread';

      const commentEl = buildCommentEl(c, false);
      commentWrapper.appendChild(commentEl);

      // Replies toggle
      if (c.reply_count > 0) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'comment-replies-toggle';
        toggleBtn.textContent = `Ver ${c.reply_count} respuesta${c.reply_count > 1 ? 's' : ''}`;
        let repliesContainer: HTMLDivElement | null = null;
        let expanded = false;

        toggleBtn.addEventListener('click', async () => {
          if (expanded && repliesContainer) {
            repliesContainer.remove();
            repliesContainer = null;
            expanded = false;
            toggleBtn.textContent = `Ver ${c.reply_count} respuesta${c.reply_count > 1 ? 's' : ''}`;
            return;
          }
          toggleBtn.textContent = 'Cargando...';
          const replies = await fetchReplies(c.id);
          repliesContainer = document.createElement('div');
          repliesContainer.className = 'comment-replies';
          for (const reply of replies) {
            // Add reply votes to the map if user has voted
            repliesContainer.appendChild(buildCommentEl(reply, true));
          }
          commentWrapper.appendChild(repliesContainer);
          expanded = true;
          toggleBtn.textContent = `Ocultar ${c.reply_count} respuesta${c.reply_count > 1 ? 's' : ''}`;
        });

        commentWrapper.appendChild(toggleBtn);
      }

      commentList.appendChild(commentWrapper);
    });

    if (list.length === 0 && comments.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'comments-empty';
      empty.textContent = 'No hay comentarios aún. ¡Sé el primero!';
      commentList.appendChild(empty);
    } else if (list.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'comments-empty';
      empty.textContent = 'No se encontraron comentarios.';
      commentList.appendChild(empty);
    }
  }

  let refreshId = 0;
  function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function fetchCommentsWithRetry(attempts = 2) {
    let result = await fetchCommentsWithVotes(video.id);
    for (let attempt = 1; attempt < attempts && result.error; attempt += 1) {
      await wait(250);
      result = await fetchCommentsWithVotes(video.id);
    }
    return result;
  }

  async function refreshComments() {
    const id = ++refreshId;
    commentsLoading = true;
    commentsError = null;
    updateCommentsTitle();
    renderComments();

    const result = await fetchCommentsWithRetry(2);
    if (id !== refreshId) return; // stale, a newer refresh is in progress
    commentsLoading = false;

    if (result.error) {
      comments = [];
      userVotes = new Map();
      commentsError = result.error;
      updateCommentsTitle();
      renderComments();
      return;
    }

    comments = result.comments;
    userVotes = result.userVotes;
    commentsError = null;
    updateCommentsTitle();
    renderComments();
  }

  // Sort buttons
  const sortOptions: { label: string; key: 'recent' | 'popular' | 'oldest' }[] = [
    { label: 'Más recientes', key: 'recent' },
    { label: 'Más populares', key: 'popular' },
    { label: 'Más antiguos', key: 'oldest' },
  ];

  sortOptions.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'comments-sort-btn' + (i === 0 ? ' active' : '');
    btn.textContent = opt.label;
    btn.addEventListener('click', () => {
      sortButtons.querySelectorAll('.comments-sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSort = opt.key;
      renderComments();
    });
    sortButtons.appendChild(btn);
  });

  searchInput.addEventListener('input', renderComments);

  commentsHeader.append(commentsTitle, sortButtons);

  // Comment input
  const commentInput = document.createElement('div');
  commentInput.className = 'comment-input';

  const inputAvatar = document.createElement('div');
  inputAvatar.className = 'comment-avatar';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'comment-input-field';

  function updateCommentInput() {
    const auth = getAuthState();
    inputAvatar.innerHTML = '';

    if (auth.isLoggedIn) {
      if (auth.profile?.avatar_url) {
        const img = document.createElement('img');
        img.src = auth.profile.avatar_url;
        img.alt = auth.profile.display_name;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.borderRadius = '50%';
        img.style.objectFit = 'cover';
        inputAvatar.appendChild(img);
        inputAvatar.style.background = 'none';
      } else {
        const name = auth.profile?.display_name || 'U';
        inputAvatar.textContent = name.charAt(0).toUpperCase();
        inputAvatar.style.background = hashColor(name);
      }
      input.placeholder = 'Añade un comentario...';
      input.disabled = false;
    } else {
      inputAvatar.textContent = '?';
      inputAvatar.style.background = hashColor('guest');
      input.placeholder = 'Inicia sesión para comentar';
      input.disabled = true;
    }
  }

  updateCommentInput();

  // Listen for auth changes to update input
  let prevLoggedIn = getAuthState().isLoggedIn;
  const unsub = subscribe((state) => {
    updateCommentInput();
    // Only refresh comments when login state actually changes
    if (state.isLoggedIn !== prevLoggedIn) {
      prevLoggedIn = state.isLoggedIn;
      refreshComments();
    }
  });

  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      const text = input.value.trim();
      input.value = '';
      input.disabled = true;
      const newComment = await postComment(video.id, text);
      input.disabled = false;
      if (newComment) {
        await refreshComments();
      }
      input.focus();
    }
  });

  commentInput.append(inputAvatar, input);

  commentsPanel.append(commentsHeader, commentSearch, commentInput, commentList);
  if (isPlaylistPlayback) {
    const tabs = document.createElement('div');
    tabs.className = 'watch-page-secondary-tabs';

    const commentsTab = document.createElement('button');
    commentsTab.type = 'button';
    commentsTab.className = 'watch-page-secondary-tab';
    commentsTab.textContent = 'Comentarios';

    const queueTab = document.createElement('button');
    queueTab.type = 'button';
    queueTab.className = 'watch-page-secondary-tab';
    queueTab.textContent = 'Cola de videos';

    tabs.append(commentsTab, queueTab);

    const queuePanel = document.createElement('div');
    queuePanel.className = 'watch-page-secondary-panel';

    function setActiveSecondaryTab(tab: 'comments' | 'queue') {
      const commentsActive = tab === 'comments';
      commentsTab.classList.toggle('active', commentsActive);
      queueTab.classList.toggle('active', !commentsActive);
      commentsPanel.style.display = commentsActive ? '' : 'none';
      queuePanel.style.display = commentsActive ? 'none' : '';
    }

    commentsTab.addEventListener('click', () => setActiveSecondaryTab('comments'));
    queueTab.addEventListener('click', () => setActiveSecondaryTab('queue'));

    const queueHeading = document.createElement('h3');
    queueHeading.className = 'watch-page-section-title';
    queueHeading.textContent = queue?.listName || 'Cola de videos';

    const queueList = document.createElement('div');
    queueList.className = 'watch-page-queue-list';
    let draggedVideoId: string | null = null;
    let suppressClickAfterDrag = false;
    let openQueueMenuVideoId: string | null = null;

    const clearDragStates = () => {
      queueList.querySelectorAll('.watch-page-queue-item').forEach((node) => {
        node.classList.remove('drag-over');
        node.classList.remove('dragging');
      });
    };

    const renderQueueList = () => {
      queueList.innerHTML = '';

      if (orderedQueueVideos.length === 0) {
        const emptyQueue = document.createElement('p');
        emptyQueue.className = 'comments-empty';
        emptyQueue.textContent = 'Esta cola esta vacia.';
        queueList.appendChild(emptyQueue);
        return;
      }

      orderedQueueVideos.forEach((queueVideo) => {
        const isCurrent = queueVideo.id === video.id;
        const isMenuOpen = openQueueMenuVideoId === queueVideo.id;
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'watch-page-queue-item'
          + (isCurrent ? ' active' : '')
          + (isMenuOpen ? ' options-open' : '');
        item.draggable = false;

        const options = document.createElement('div');
        options.className = 'watch-page-queue-options';

        const optionsBtn = document.createElement('button');
        optionsBtn.type = 'button';
        optionsBtn.className = 'watch-page-queue-options-btn' + (isMenuOpen ? ' is-open' : '');
        optionsBtn.setAttribute('aria-label', 'Opciones de video en cola');

        const optionsIcon = document.createElement('span');
        optionsIcon.className = 'watch-page-queue-options-icon';
        optionsIcon.style.setProperty('--menu-icon', `url("${menuIcon}")`);
        optionsBtn.appendChild(optionsIcon);

        const optionsMenu = document.createElement('div');
        optionsMenu.className = 'watch-page-queue-options-menu' + (isMenuOpen ? ' open' : '');

        const createOption = (
          label: string,
          onClick: () => void,
          disabled = false,
        ): HTMLButtonElement => {
          const option = document.createElement('button');
          option.type = 'button';
          option.className = 'watch-page-queue-options-item';
          option.textContent = label;
          option.disabled = disabled;
          option.addEventListener('click', (event) => {
            event.stopPropagation();
            if (disabled) return;
            openQueueMenuVideoId = null;
            onClick();
          });
          return option;
        };

        const moveVideoToIndex = (toIndex: number) => {
          const fromIndex = orderedQueueVideos.findIndex((entry) => entry.id === queueVideo.id);
          if (fromIndex < 0 || fromIndex === toIndex) return;

          const boundedIndex = Math.max(0, Math.min(toIndex, orderedQueueVideos.length - 1));
          const [moved] = orderedQueueVideos.splice(fromIndex, 1);
          orderedQueueVideos.splice(boundedIndex, 0, moved);
          persistQueueOrder();
          renderQueueList();
        };

        optionsMenu.append(
          createOption('Reproducir ahora', () => {
            const route = queueListId
              ? `/watch/${queueVideo.id}/playlist/${queueListId}`
              : `/watch/${queueVideo.id}`;
            navigate(route);
          }),
          createOption('Mover arriba', () => {
            const idx = orderedQueueVideos.findIndex((entry) => entry.id === queueVideo.id);
            moveVideoToIndex(idx - 1);
          }, isCurrent || orderedQueueVideos[0]?.id === queueVideo.id),
          createOption('Mover abajo', () => {
            const idx = orderedQueueVideos.findIndex((entry) => entry.id === queueVideo.id);
            moveVideoToIndex(idx + 1);
          }, isCurrent || orderedQueueVideos[orderedQueueVideos.length - 1]?.id === queueVideo.id),
        );

        optionsBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          openQueueMenuVideoId = openQueueMenuVideoId === queueVideo.id ? null : queueVideo.id;
          renderQueueList();
        });

        options.append(optionsBtn, optionsMenu);

        const handle = document.createElement('span');
        handle.className = 'watch-page-queue-handle' + (isCurrent ? ' is-disabled' : '');
        handle.draggable = !isCurrent;
        handle.innerHTML = `
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="8" cy="6" r="1.3"/><circle cx="16" cy="6" r="1.3"/>
            <circle cx="8" cy="12" r="1.3"/><circle cx="16" cy="12" r="1.3"/>
            <circle cx="8" cy="18" r="1.3"/><circle cx="16" cy="18" r="1.3"/>
          </svg>
        `;
        handle.addEventListener('click', (event) => event.stopPropagation());

        const thumb = document.createElement('span');
        thumb.className = 'watch-page-queue-thumb';

        if (queueVideo.thumbnailUrl) {
          const img = document.createElement('img');
          img.src = queueVideo.thumbnailUrl;
          img.alt = queueVideo.title;
          thumb.appendChild(img);
        } else {
          thumb.style.background = `var(--gradient-${queueVideo.gradientIndex}, var(--bg-secondary))`;
          if (queueVideo.videoUrl) {
            void applyQueueGeneratedThumbnail(thumb, queueVideo.videoUrl, queueVideo.title);
          }
        }

        const duration = document.createElement('span');
        duration.className = 'watch-page-queue-duration';
        const durationLabel = normalizeDurationLabel(queueVideo.duration) || queueDurationCache.get(queueVideo.id) || '';
        duration.textContent = durationLabel;

        if (!durationLabel) {
          void resolveQueueDuration(queueVideo).then((resolved) => {
            if (!resolved || !duration.isConnected) return;
            queueVideo.duration = resolved;
            duration.textContent = resolved;
          });
        }
        thumb.appendChild(duration);

        const meta = document.createElement('span');
        meta.className = 'watch-page-queue-meta';

        const title = document.createElement('span');
        title.className = 'watch-page-queue-title';
        title.textContent = queueVideo.title;

        const channel = document.createElement('span');
        channel.className = 'watch-page-queue-channel';
        channel.textContent = queueVideo.channelName;

        meta.append(title, channel);
        item.append(options, handle, thumb, meta);

        item.addEventListener('click', () => {
          if (suppressClickAfterDrag) return;
          const route = queueListId
            ? `/watch/${queueVideo.id}/playlist/${queueListId}`
            : `/watch/${queueVideo.id}`;
          navigate(route);
        });

        if (!isCurrent) {
          handle.addEventListener('dragstart', (event) => {
            draggedVideoId = queueVideo.id;
            suppressClickAfterDrag = true;
            item.classList.add('dragging');
            event.dataTransfer?.setData('text/plain', queueVideo.id);
            if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
          });

          handle.addEventListener('dragend', () => {
            draggedVideoId = null;
            clearDragStates();
            window.setTimeout(() => {
              suppressClickAfterDrag = false;
            }, 80);
          });
        }

        item.addEventListener('dragover', (event) => {
          if (!draggedVideoId || draggedVideoId === queueVideo.id) return;
          event.preventDefault();
          item.classList.add('drag-over');
        });

        item.addEventListener('dragleave', () => {
          item.classList.remove('drag-over');
        });

        item.addEventListener('drop', (event) => {
          if (!draggedVideoId || draggedVideoId === queueVideo.id) return;
          event.preventDefault();

          const fromIndex = orderedQueueVideos.findIndex((entry) => entry.id === draggedVideoId);
          const targetIndex = orderedQueueVideos.findIndex((entry) => entry.id === queueVideo.id);
          if (fromIndex < 0 || targetIndex < 0 || fromIndex === targetIndex) {
            clearDragStates();
            return;
          }

          const rect = item.getBoundingClientRect();
          const dropAfter = event.clientY > rect.top + (rect.height / 2);
          let insertIndex = targetIndex + (dropAfter ? 1 : 0);

          const [moved] = orderedQueueVideos.splice(fromIndex, 1);
          if (fromIndex < insertIndex) insertIndex -= 1;
          orderedQueueVideos.splice(insertIndex, 0, moved);

          persistQueueOrder();
          clearDragStates();
          renderQueueList();
        });

        queueList.appendChild(item);
      });
    };

    renderQueueList();

    const closeQueueMenusOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const node = target as HTMLElement;
      if (node.closest('.watch-page-queue-options')) return;
      if (!openQueueMenuVideoId) return;
      openQueueMenuVideoId = null;
      renderQueueList();
    };

    document.addEventListener('click', closeQueueMenusOnOutsideClick);
    cleanupQueueMenus = () => {
      document.removeEventListener('click', closeQueueMenusOnOutsideClick);
    };

    queuePanel.append(queueHeading, queueList);
    secondary.append(tabs, commentsPanel, queuePanel);
    setActiveSecondaryTab(queueVideos.length > 0 ? 'queue' : 'comments');
  } else {
    secondary.append(commentsPanel);
  }

  page.append(primary, secondary);

  // Load comments
  refreshComments();

  // Cleanup on removal — wait until mounted before observing
  let mounted = false;
  const observer = new MutationObserver(() => {
    if (!mounted) {
      if (document.contains(page)) mounted = true;
      return;
    }
    if (!document.contains(page)) {
      unsub();
      cleanupQueueMenus?.();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return page;
}
