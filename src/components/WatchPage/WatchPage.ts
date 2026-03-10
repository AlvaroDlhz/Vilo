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

export interface WatchPageOptions {
  video: VideoData;
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
  const { video } = options;

  const page = document.createElement('div');
  page.className = 'watch-page';

  // Primary column: player + info + recommended
  const primary = document.createElement('div');
  primary.className = 'watch-page-primary';

  const player = VideoPlayer({
    videoUrl: video.videoUrl,
    gradientIndex: video.gradientIndex,
    duration: video.duration,
  });

  const info = VideoInfo({
    title: video.title,
    channelName: video.channelName,
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
      title: rec.title,
      channelName: rec.channelName,
      channelAvatar: rec.channelAvatar || undefined,
      views: rec.views,
      uploadedAt: rec.uploadedAt,
      duration: rec.duration,
      gradientIndex: rec.gradientIndex,
      variant: 'default',
      onClick: () => navigate(`/watch/${rec.id}`),
    });
    recommendations.appendChild(card);
  });

  recSection.append(recHeading, recommendations);
  primary.append(player, info, recSection);

  // Secondary column: comments
  const secondary = document.createElement('div');
  secondary.className = 'watch-page-secondary';

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
  async function refreshComments() {
    const id = ++refreshId;
    const result = await fetchCommentsWithVotes(video.id);
    if (id !== refreshId) return; // stale, a newer refresh is in progress
    comments = result.comments;
    userVotes = result.userVotes;
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

  secondary.append(commentsHeader, commentSearch, commentInput, commentList);
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
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return page;
}
