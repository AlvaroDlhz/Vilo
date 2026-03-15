import './VideoInfo.css';
import { hashColor } from '../../utils/avatarColor';
import { getChannelIdByName } from '../../data/channelStore';
import { navigate } from '../../router/router';
import { voteVideo, getUserVideoVote, getVideoStats } from '../../lib/videoInteractions';
import { getAuthState, subscribe as subscribeAuth } from '../../data/authStore';
import { supabase } from '../../lib/supabase';
import { toggleSubscription, isSubscribed, getSubscriberCount } from '../../lib/subscriptions';
import {
  getSavedLists,
  isVideoSavedAnywhere,
  isVideoSavedInList,
  removeVideoFromList,
  saveVideoToList,
} from '../../data/savedStore';

export interface VideoInfoOptions {
  title: string;
  channelName: string;
  channelAvatar?: string;
  subscribers: string;
  views: string;
  publishedDate: string;
  likes: string;
  dislikes: string;
  description: string;
  videoId?: string;
  channelUserId?: string;
}

function formatViewCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M vistas`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K vistas`;
  return `${n} vista${n !== 1 ? 's' : ''}`;
}

interface SaveListsModalResult {
  listIds: string[];
  initialIds: string[];
  selectedIds: string[];
}

function openSaveToListsModal(videoId: string): Promise<SaveListsModalResult | null> {
  const lists = getSavedLists();
  const initialSelected = new Set(
    lists
      .filter((list) => isVideoSavedInList(videoId, list.id))
      .map((list) => list.id),
  );
  const selected = new Set(initialSelected);

  return new Promise((resolve) => {
    const previous = document.querySelector('.video-info-save-modal-backdrop');
    if (previous) previous.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'video-info-save-modal-backdrop';

    const dialog = document.createElement('div');
    dialog.className = 'video-info-save-modal';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'Guardar video en listas');

    const subtitle = document.createElement('p');
    subtitle.className = 'video-info-save-modal-subtitle';
    subtitle.textContent = 'Selecciona una o varias listas';

    const body = document.createElement('div');
    body.className = 'video-info-save-modal-body';

    const list = document.createElement('div');
    list.className = 'video-info-save-modal-list';

    const itemById = new Map<string, HTMLButtonElement>();

    const setItemState = (item: HTMLButtonElement, isSelected: boolean) => {
      item.classList.toggle('is-selected', isSelected);
      item.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    };

    lists.forEach((savedList) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'video-info-save-list-item';

      const left = document.createElement('span');
      left.className = 'video-info-save-list-left';

      const check = document.createElement('span');
      check.className = 'video-info-save-list-check';
      check.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;

      const name = document.createElement('span');
      name.className = 'video-info-save-list-name';
      name.textContent = savedList.name;

      const count = document.createElement('span');
      count.className = 'video-info-save-list-count';
      count.textContent = `${savedList.videoIds.length} videos`;

      left.append(check, name);
      item.append(left, count);

      const toggle = () => {
        if (selected.has(savedList.id)) selected.delete(savedList.id);
        else selected.add(savedList.id);
        setItemState(item, selected.has(savedList.id));
      };

      item.addEventListener('click', toggle);
      setItemState(item, selected.has(savedList.id));
      itemById.set(savedList.id, item);
      list.appendChild(item);
    });

    body.append(subtitle, list);

    const footer = document.createElement('div');
    footer.className = 'video-info-save-modal-footer';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'video-info-save-modal-btn video-info-save-modal-btn--ghost';
    cancelBtn.textContent = 'Cancelar';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'video-info-save-modal-btn video-info-save-modal-btn--primary';
    saveBtn.textContent = 'Guardar';

    footer.append(cancelBtn, saveBtn);
    dialog.append(body, footer);
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    const cleanup = () => {
      document.removeEventListener('keydown', onKeyDown);
      backdrop.remove();
    };

    const closeWith = (result: SaveListsModalResult | null) => {
      cleanup();
      resolve(result);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeWith(null);
      }
    };

    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) closeWith(null);
    });

    cancelBtn.addEventListener('click', () => closeWith(null));
    saveBtn.addEventListener('click', () => {
      closeWith({
        listIds: Array.from(itemById.keys()),
        initialIds: Array.from(initialSelected),
        selectedIds: Array.from(selected),
      });
    });

    document.addEventListener('keydown', onKeyDown);
  });
}

export function VideoInfo(options: VideoInfoOptions): HTMLDivElement {
  const { title, channelName, channelAvatar, subscribers, views, publishedDate, likes, dislikes, description, videoId, channelUserId } = options;

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
  
  avatar.addEventListener('click', () => navigate(`/channel/${channelId}`));

  const channelText = document.createElement('div');
  channelText.className = 'video-info-channel-text';

  const channelNameEl = document.createElement('span');
  channelNameEl.className = 'video-info-channel-name';
  channelNameEl.textContent = channelName;
  channelNameEl.style.cursor = 'pointer';
  channelNameEl.addEventListener('click', () => navigate(`/channel/${channelId}`));

  const channelHandle = document.createElement('span');
  channelHandle.className = 'video-info-channel-handle';
  channelHandle.textContent = `@${channelId}`;

  const subscribersEl = document.createElement('span');
  subscribersEl.className = 'video-info-subscribers';
  subscribersEl.textContent = subscribers;

  channelText.append(channelNameEl, channelHandle, subscribersEl);

  const subscribeBtn = document.createElement('button');
  subscribeBtn.className = 'video-info-subscribe';
  subscribeBtn.textContent = 'Suscribirse';
  let unsubscribeAuth: (() => void) | null = null;

  function formatSubscriberCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M suscriptores`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K suscriptores`;
    if (n === 1) return '1 suscriptor';
    return `${n} suscriptores`;
  }

  if (channelUserId) {
    let subscriberCountValue: number | null = null;
    let refreshSubscriptionId = 0;
    let subscribeBusy = false;

    const setSubscribeVisualState = (subscribed: boolean) => {
      subscribeBtn.textContent = subscribed ? 'Desuscribirse' : 'Suscribirse';
      subscribeBtn.classList.toggle('subscribed', subscribed);
    };

    const updateSubscriberLabel = () => {
      subscribersEl.textContent = subscriberCountValue === null
        ? subscribers
        : formatSubscriberCount(subscriberCountValue);
    };

    const refreshSubscriptionState = async () => {
      const refreshId = ++refreshSubscriptionId;
      const auth = getAuthState();
      const isOwnChannel = auth.isLoggedIn && auth.user?.id === channelUserId;

      subscribeBtn.style.display = isOwnChannel ? 'none' : '';
      if (isOwnChannel) return;

      if (!subscribeBusy) subscribeBtn.disabled = true;

      const [count, subscribed] = await Promise.all([
        getSubscriberCount(channelUserId),
        auth.isLoggedIn ? isSubscribed(channelUserId) : Promise.resolve(false),
      ]);

      if (refreshId !== refreshSubscriptionId) return;

      subscriberCountValue = count;
      updateSubscriberLabel();
      setSubscribeVisualState(subscribed);
      if (!subscribeBusy) subscribeBtn.disabled = false;
    };

    subscribeBtn.addEventListener('click', async () => {
      if (!getAuthState().isLoggedIn || subscribeBusy) return;

      subscribeBusy = true;
      subscribeBtn.disabled = true;

      const wasSubscribed = subscribeBtn.classList.contains('subscribed');
      setSubscribeVisualState(!wasSubscribed);

      if (subscriberCountValue !== null) {
        subscriberCountValue = Math.max(0, subscriberCountValue + (wasSubscribed ? -1 : 1));
        updateSubscriberLabel();
      }

      const ok = await toggleSubscription(channelUserId);
      if (!ok) {
        setSubscribeVisualState(wasSubscribed);
        if (subscriberCountValue !== null) {
          subscriberCountValue = Math.max(0, subscriberCountValue + (wasSubscribed ? 1 : -1));
          updateSubscriberLabel();
        }
      }

      await refreshSubscriptionState();
      subscribeBusy = false;
      subscribeBtn.disabled = false;
    });

    void refreshSubscriptionState();
    unsubscribeAuth = subscribeAuth(() => {
      void refreshSubscriptionState();
    });
  } else {
    subscribeBtn.style.display = 'none';
  }

  const sponsorBtn = document.createElement('button');
  sponsorBtn.className = 'video-info-sponsor';
  sponsorBtn.textContent = '$ Patrocinar';

  channelLeft.append(avatar, channelText, subscribeBtn, sponsorBtn);

  // Description meta (created early so refreshStats can reference it)
  const descMeta = document.createElement('p');
  descMeta.className = 'video-info-description-meta';
  descMeta.textContent = `${views} · ${publishedDate}`;

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

  // Wire like/dislike interactions
  if (videoId) {
    let currentVote: number | null = null;
    let currentLikes = parseInt(likes) || 0;
    let currentDislikes = parseInt(dislikes) || 0;

    function updateVoteUI() {
      const likeSpan = likeBtn.querySelector('span');
      const dislikeSpan = dislikeBtn.querySelector('span');
      if (likeSpan) likeSpan.textContent = String(currentLikes);
      if (dislikeSpan) dislikeSpan.textContent = String(currentDislikes);
      likeBtn.classList.toggle('active', currentVote === 1);
      dislikeBtn.classList.toggle('active', currentVote === -1);
    }

    // Load initial state from server
    (async () => {
      const [stats, vote] = await Promise.all([getVideoStats(videoId!), getUserVideoVote(videoId!)]);
      currentLikes = stats.likes;
      currentDislikes = stats.dislikes;
      currentVote = vote;
      descMeta.textContent = `${formatViewCount(stats.viewCount)} · ${publishedDate}`;
      updateVoteUI();
    })();

    function applyOptimisticVote(vote: 1 | -1) {
      if (currentVote === vote) {
        // Toggle off
        if (vote === 1) currentLikes--;
        else currentDislikes--;
        currentVote = null;
      } else {
        // Remove previous vote if any
        if (currentVote === 1) currentLikes--;
        else if (currentVote === -1) currentDislikes--;
        // Apply new
        if (vote === 1) currentLikes++;
        else currentDislikes++;
        currentVote = vote;
      }
      updateVoteUI();
    }

    likeBtn.addEventListener('click', () => {
      if (!getAuthState().isLoggedIn) return;
      applyOptimisticVote(1);
      voteVideo(videoId!, 1);
    });

    dislikeBtn.addEventListener('click', () => {
      if (!getAuthState().isLoggedIn) return;
      applyOptimisticVote(-1);
      voteVideo(videoId!, -1);
    });

    // Realtime subscription for live likes/dislikes/views updates
    const realtimeChannel = supabase
      .channel(`video-stats-${videoId}`)
      .on(
        'postgres_changes' as any,
        { event: 'UPDATE', schema: 'public', table: 'user_videos', filter: `id=eq.${videoId}` },
        (payload: any) => {
          const row = payload.new;
          if (row) {
            currentLikes = row.likes ?? currentLikes;
            currentDislikes = row.dislikes ?? currentDislikes;
            updateVoteUI();
            const viewCount = row.view_count ?? 0;
            descMeta.textContent = `${formatViewCount(viewCount)} · ${publishedDate}`;
          }
        },
      )
      .subscribe();

    // Cleanup realtime channel when element is removed from DOM
    let rtMounted = false;
    const rtObserver = new MutationObserver(() => {
      if (!rtMounted) {
        if (document.contains(container)) rtMounted = true;
        return;
      }
      if (!document.contains(container)) {
        supabase.removeChannel(realtimeChannel);
        rtObserver.disconnect();
      }
    });
    rtObserver.observe(document.body, { childList: true, subtree: true });
  }

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

  const saveLabel = saveBtn.querySelector('span');
  const updateSaveBtnState = () => {
    if (!videoId) return;
    const saved = isVideoSavedAnywhere(videoId);
    saveBtn.classList.toggle('active', saved);
    if (saveLabel) saveLabel.textContent = saved ? 'Guardado' : 'Guardar';
  };

  if (videoId) {
    updateSaveBtnState();
    saveBtn.addEventListener('click', async () => {
      const selection = await openSaveToListsModal(videoId);
      if (!selection) return;

      const initialIds = new Set(selection.initialIds);
      const selectedIds = new Set(selection.selectedIds);

      selection.listIds.forEach((listId) => {
        const wasSelected = initialIds.has(listId);
        const isSelectedNow = selectedIds.has(listId);
        if (wasSelected === isSelectedNow) return;

        if (isSelectedNow) saveVideoToList(videoId, listId);
        else removeVideoFromList(videoId, listId);
      });

      updateSaveBtnState();
    });
  }

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

  if (unsubscribeAuth) {
    let mounted = false;
    const observer = new MutationObserver(() => {
      if (!mounted) {
        if (document.contains(container)) mounted = true;
        return;
      }
      if (!document.contains(container)) {
        unsubscribeAuth?.();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

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
