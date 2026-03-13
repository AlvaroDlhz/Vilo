import './Navbar.css';
import { MenuButton } from '../MenuButton/MenuButton';
import { Logo } from '../Logo/Logo';
import { SearchBar } from '../SearchBar/SearchBar';
import { UserAvatar } from '../UserAvatar/UserAvatar';
import { FeedsMenu } from '../FeedsMenu/FeedsMenu';
import { AuthModal } from '../AuthModal/AuthModal';
import { Feed } from '../../data/feedStore';
import { hashColor } from '../../utils/avatarColor';
import { subscribe, getAuthState, type AuthState } from '../../data/authStore';
import { signOut } from '../../lib/auth';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  showBrowserNotification,
  type AppNotification,
} from '../../lib/notifications';
import { navigate } from '../../router/router';
import plusIcon from '/assets/plus.svg?raw';
import notifIcon from '/assets/notifications.svg?raw';
import chatIcon from '/assets/chat.svg?raw';
import voiceIcon from '/assets/voice.svg?raw';

export interface NavbarOptions {
  brandName?: string;
  searchPlaceholder?: string;
  onMenuClick?: () => void;
  onLogoClick?: () => void;
  onSearchInput?: (value: string) => void;
  onPublishClick?: () => void;
  onUserClick?: () => void;
  onFeedChange?: (feed: Feed) => void;
}

export function Navbar(options: NavbarOptions = {}): HTMLElement {
  const {
    brandName = 'Vilo',
    searchPlaceholder = 'Buscar...',
    onMenuClick,
    onLogoClick,
    onSearchInput,
    onPublishClick,
    onUserClick,
    onFeedChange,
  } = options;

  const wrapper = document.createElement('div');
  wrapper.className = 'navbar-wrapper';

  const menuBtn = MenuButton(() => {
    onMenuClick?.();
  });

  const navbar = document.createElement('nav');
  navbar.className = 'navbar';

  const logo = Logo({
    brandName,
    onClick: () => {
      onLogoClick?.();
    },
  });

  const searchBar = SearchBar({
    placeholder: searchPlaceholder,
    onInput: (e) => {
      const value = (e.target as HTMLInputElement).value;
      onSearchInput?.(value);
    },
  });

  // --- Publish dropdown ---
  const publishContainer = document.createElement('div');
  publishContainer.className = 'navbar-dropdown-container';

  const publishBtn = document.createElement('button');
  publishBtn.className = 'publish-btn';
  publishBtn.innerHTML = `${plusIcon}<span>Publicar</span>`;

  const publishDropdown = document.createElement('div');
  publishDropdown.className = 'navbar-dropdown publish-dropdown';

  // Stable container for publish dropdown interior
  const publishDropdownInner = document.createElement('div');
  publishDropdown.appendChild(publishDropdownInner);

  publishContainer.append(publishBtn, publishDropdown);

  const userAvatar = UserAvatar({
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=felix',
  });

  // Auth modal
  const authModal = AuthModal();
  document.body.appendChild(authModal.getElement());

  // Auth dropdown (for non-logged-in users)
  const authDropdown = document.createElement('div');
  authDropdown.className = 'profile-dropdown';

  const loginItem = document.createElement('div');
  loginItem.className = 'profile-dropdown-item';
  loginItem.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg><span>Iniciar sesión</span>`;
  loginItem.addEventListener('click', () => {
    authDropdown.classList.remove('open');
    authModal.showLogin();
  });

  const registerItem = document.createElement('div');
  registerItem.className = 'profile-dropdown-item primary';
  registerItem.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg><span>Crear cuenta</span>`;
  registerItem.addEventListener('click', () => {
    authDropdown.classList.remove('open');
    authModal.showRegister();
  });

  authDropdown.append(loginItem, registerItem);

  // Profile dropdown (for logged-in users)
  const profileDropdown = document.createElement('div');
  profileDropdown.className = 'profile-dropdown';

  // Stable container for profile dropdown interior
  const profileDropdownInner = document.createElement('div');
  profileDropdown.appendChild(profileDropdownInner);

  let notifications: AppNotification[] = [];
  let notificationsTeardown: (() => void) | null = null;
  let notificationsUserId: string | null = null;
  let notificationsLoaded = false;

  const chats = [
    { name: 'María López', message: 'Hola! Vi tu último video, está genial', time: 'Hace 10 min', unread: true },
    { name: 'Carlos García', message: 'Gracias por la info!', time: 'Hace 2 horas', unread: false },
    { name: 'Ana Martínez', message: '¿Cuándo subes el siguiente?', time: 'Hace 4 horas', unread: true },
    { name: 'Diego Torres', message: 'Te envié el enlace', time: 'Ayer', unread: false },
    { name: 'Sofía Ruiz', message: 'Perfecto, nos vemos!', time: 'Hace 2 días', unread: false },
  ];

  // --- Notification dropdown ---
  const notifContainer = document.createElement('div');
  notifContainer.className = 'navbar-dropdown-container';

  const notifBtn = document.createElement('button');
  notifBtn.className = 'notif-btn';
  notifBtn.setAttribute('aria-label', 'Notificaciones');
  notifBtn.innerHTML = notifIcon;

  const notifBadge = document.createElement('span');
  notifBadge.className = 'navbar-dropdown-badge';

  const notifDropdown = document.createElement('div');
  notifDropdown.className = 'navbar-dropdown';

  // Stable container for notif dropdown interior
  const notifDropdownInner = document.createElement('div');
  notifDropdown.appendChild(notifDropdownInner);

  notifContainer.append(notifBtn, notifBadge, notifDropdown);

  // --- Chat dropdown ---
  const chatContainer = document.createElement('div');
  chatContainer.className = 'navbar-dropdown-container';

  const chatBtn = document.createElement('button');
  chatBtn.className = 'notif-btn';
  chatBtn.setAttribute('aria-label', 'Mensajes');
  chatBtn.innerHTML = chatIcon;

  const chatBadge = document.createElement('span');
  chatBadge.className = 'navbar-dropdown-badge';

  const chatDropdown = document.createElement('div');
  chatDropdown.className = 'navbar-dropdown';

  // Stable container for chat dropdown interior
  const chatDropdownInner = document.createElement('div');
  chatDropdown.appendChild(chatDropdownInner);

  chatContainer.append(chatBtn, chatBadge, chatDropdown);

  // --- Toggle & coordination ---
  function closeAllDropdowns() {
    publishDropdown.classList.remove('open');
    notifDropdown.classList.remove('open');
    chatDropdown.classList.remove('open');
    profileDropdown.classList.remove('open');
    authDropdown.classList.remove('open');
  }

  function formatNotificationTime(dateStr: string): string {
    const then = new Date(dateStr).getTime();
    const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
    if (diffSec < 60) return 'Ahora';
    if (diffSec < 3600) return `Hace ${Math.floor(diffSec / 60)} min`;
    if (diffSec < 86400) return `Hace ${Math.floor(diffSec / 3600)} h`;
    if (diffSec < 604800) return `Hace ${Math.floor(diffSec / 86400)} d`;
    return new Date(dateStr).toLocaleDateString();
  }

  function teardownNotifications() {
    if (notificationsTeardown) {
      notificationsTeardown();
      notificationsTeardown = null;
    }
    notificationsUserId = null;
    notificationsLoaded = false;
    notifications = [];
  }

  async function refreshNotificationList(userId: string) {
    const items = await fetchNotifications(20);
    if (notificationsUserId !== userId) return;
    notifications = items;
    notificationsLoaded = true;
    renderNotificationDropdown(true);
  }

  function ensureNotificationFeed(userId: string) {
    if (notificationsUserId === userId && notificationsTeardown) return;

    teardownNotifications();
    notificationsUserId = userId;
    notificationsLoaded = false;
    notificationsTeardown = subscribeToNotifications(userId, (event, notification) => {
      if (event === 'INSERT') {
        notifications = [notification, ...notifications.filter((item) => item.id !== notification.id)].slice(0, 20);
        showBrowserNotification(notification);
      } else {
        notifications = notifications.map((item) => (item.id === notification.id ? notification : item));
      }
      renderNotificationDropdown(true);
    });
  }

  function renderNotificationDropdown(isLoggedIn: boolean) {
    notifDropdownInner.innerHTML = '';
    const notifHeader = document.createElement('div');
    notifHeader.className = 'navbar-dropdown-header';
    const notifTitle = document.createElement('span');
    notifTitle.className = 'navbar-dropdown-header-title';
    notifTitle.textContent = 'Notificaciones';

    if (isLoggedIn) {
      const unreadCount = notifications.filter((item) => !item.read_at).length;
      notifBadge.textContent = String(unreadCount);
      notifBadge.style.display = unreadCount === 0 ? 'none' : '';

      const headerActions = document.createElement('div');
      headerActions.className = 'navbar-dropdown-header-actions';

      if (getBrowserNotificationPermission() === 'default') {
        const enableBtn = document.createElement('button');
        enableBtn.className = 'navbar-dropdown-header-action';
        enableBtn.textContent = 'Activar alertas';
        enableBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await requestBrowserNotificationPermission();
          renderNotificationDropdown(true);
        });
        headerActions.appendChild(enableBtn);
      }

      const markReadBtn = document.createElement('button');
      markReadBtn.className = 'navbar-dropdown-header-action';
      markReadBtn.textContent = 'Marcar como leidas';
      markReadBtn.disabled = unreadCount === 0;
      markReadBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const ok = await markAllNotificationsRead();
        if (!ok) return;
        const readAt = new Date().toISOString();
        notifications = notifications.map((item) => ({ ...item, read_at: item.read_at ?? readAt }));
        renderNotificationDropdown(true);
      });
      headerActions.appendChild(markReadBtn);

      notifHeader.append(notifTitle, headerActions);
      notifDropdownInner.appendChild(notifHeader);

      if (notifications.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'navbar-dropdown-empty';
        empty.textContent = 'Aun no tienes notificaciones.';
        notifDropdownInner.appendChild(empty);
        return;
      }

      notifications.forEach((notification) => {
        const item = document.createElement('div');
        item.className = `navbar-dropdown-item${notification.read_at ? '' : ' unread'}`;

        const actorName = notification.actor_profile?.display_name
          || notification.actor_profile?.username
          || 'Vilo';

        const avatar = document.createElement('div');
        avatar.className = 'navbar-dropdown-item-avatar';
        avatar.style.background = hashColor(actorName);

        if (notification.actor_profile?.avatar_url) {
          avatar.style.background = 'transparent';
          const img = document.createElement('img');
          img.src = notification.actor_profile.avatar_url;
          img.alt = actorName;
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.borderRadius = '50%';
          img.style.objectFit = 'cover';
          avatar.appendChild(img);
        } else {
          avatar.textContent = actorName.charAt(0).toUpperCase();
        }

        const content = document.createElement('div');
        content.className = 'navbar-dropdown-item-content';
        const text = document.createElement('span');
        text.className = 'navbar-dropdown-item-text';
        text.textContent = notification.message;
        const time = document.createElement('span');
        time.className = 'navbar-dropdown-item-time';
        time.textContent = formatNotificationTime(notification.created_at);
        content.append(text, time);

        item.append(avatar, content);

        if (!notification.read_at) {
          const dot = document.createElement('span');
          dot.className = 'navbar-dropdown-unread-dot';
          item.appendChild(dot);
        }

        item.addEventListener('click', () => {
          if (notification.read_at) return;
          notification.read_at = new Date().toISOString();
          renderNotificationDropdown(true);
          void markNotificationRead(notification.id);
        });

        notifDropdownInner.appendChild(item);
      });
    } else {
      notifBadge.style.display = 'none';
      notifHeader.appendChild(notifTitle);

      const notifCta = document.createElement('div');
      notifCta.className = 'navbar-dropdown-cta';
      notifCta.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
      const notifCtaText = document.createElement('p');
      notifCtaText.textContent = 'Crea una cuenta en Vilo para recibir notificaciones';
      const notifCtaBtn = document.createElement('button');
      notifCtaBtn.className = 'navbar-dropdown-cta-btn';
      notifCtaBtn.textContent = 'Crear cuenta';
      notifCtaBtn.addEventListener('click', () => {
        closeAllDropdowns();
        authModal.showRegister();
      });
      notifCta.append(notifCtaText, notifCtaBtn);
      notifDropdownInner.append(notifHeader, notifCta);
    }
  }

  publishBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasOpen = publishDropdown.classList.contains('open');
    closeAllDropdowns();
    if (!wasOpen) publishDropdown.classList.add('open');
    onPublishClick?.();
  });

  notifBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasOpen = notifDropdown.classList.contains('open');
    closeAllDropdowns();
    if (!wasOpen) notifDropdown.classList.add('open');
    if (getAuthState().isLoggedIn && getBrowserNotificationPermission() === 'default') {
      void requestBrowserNotificationPermission();
    }
  });

  chatBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasOpen = chatDropdown.classList.contains('open');
    closeAllDropdowns();
    if (!wasOpen) chatDropdown.classList.add('open');
  });

  userAvatar.addEventListener('click', (e) => {
    e.stopPropagation();
    const currentState = getAuthState();
    if (currentState.isLoggedIn) {
      const wasOpen = profileDropdown.classList.contains('open');
      closeAllDropdowns();
      if (!wasOpen) profileDropdown.classList.add('open');
    } else {
      const wasOpen = authDropdown.classList.contains('open');
      closeAllDropdowns();
      if (!wasOpen) authDropdown.classList.add('open');
    }
    onUserClick?.();
  });

  document.addEventListener('click', (e) => {
    const target = e.target as Node;
    if (!profileDropdown.contains(target) && !userAvatar.contains(target)) {
      profileDropdown.classList.remove('open');
    }
    if (!authDropdown.contains(target) && !userAvatar.contains(target)) {
      authDropdown.classList.remove('open');
    }
    if (!notifDropdown.contains(target) && !notifBtn.contains(target)) {
      notifDropdown.classList.remove('open');
    }
    if (!chatDropdown.contains(target) && !chatBtn.contains(target)) {
      chatDropdown.classList.remove('open');
    }
    if (!publishDropdown.contains(target) && !publishBtn.contains(target)) {
      publishDropdown.classList.remove('open');
    }
  });

  const navbarRight = document.createElement('div');
  navbarRight.className = 'navbar-right';
  navbarRight.append(chatContainer, notifContainer, publishContainer);

  const feedsMenu = FeedsMenu({
    onFeedChange: (feed) => onFeedChange?.(feed),
  });

  const voiceBtn = document.createElement('button');
  voiceBtn.className = 'notif-btn voice-btn';
  voiceBtn.setAttribute('aria-label', 'Búsqueda por voz');
  voiceBtn.innerHTML = voiceIcon;

  const searchGroup = document.createElement('div');
  searchGroup.className = 'navbar-search-group';
  searchGroup.append(feedsMenu, searchBar, voiceBtn);

  navbar.appendChild(logo);
  navbar.appendChild(searchGroup);
  navbar.appendChild(navbarRight);

  wrapper.appendChild(menuBtn);
  wrapper.appendChild(navbar);
  wrapper.appendChild(userAvatar);
  wrapper.appendChild(authDropdown);
  wrapper.appendChild(profileDropdown);

  // ===========================
  // Avatar cycling state
  // ===========================
  let cycleInterval: ReturnType<typeof setInterval> | null = null;
  const avatarSeeds = ['felix', 'aneka', 'luna', 'jasper', 'milo', 'sara', 'leo', 'noa'];
  let seedIndex = 0;
  const avatarImg = userAvatar.querySelector('img') as HTMLImageElement;

  function startAvatarCycling() {
    if (cycleInterval) return;
    userAvatar.classList.add('avatar-cycling');
    if (avatarImg) {
      avatarImg.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeeds[0]}`;
      seedIndex = 0;
      cycleInterval = setInterval(() => {
        avatarImg.classList.add('fade-out');
        setTimeout(() => {
          seedIndex = (seedIndex + 1) % avatarSeeds.length;
          avatarImg.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeeds[seedIndex]}`;
          avatarImg.classList.remove('fade-out');
        }, 400);
      }, 2000);
    }
  }

  function stopAvatarCycling() {
    if (cycleInterval) {
      clearInterval(cycleInterval);
      cycleInterval = null;
    }
    userAvatar.classList.remove('avatar-cycling');
    if (avatarImg) avatarImg.classList.remove('fade-out');
  }

  // ===========================
  // Reactive auth update
  // ===========================
  function updateNavbarForAuth(authState: AuthState) {
    const { isLoggedIn, profile } = authState;

    // --- Avatar ---
    if (avatarImg) {
      if (isLoggedIn && profile?.avatar_url) {
        stopAvatarCycling();
        avatarImg.src = profile.avatar_url;
      } else if (isLoggedIn) {
        stopAvatarCycling();
        const seed = profile?.username || profile?.display_name || 'user';
        avatarImg.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
      } else {
        startAvatarCycling();
      }
    }

    // --- Show/hide appropriate dropdown on avatar ---
    authDropdown.style.display = isLoggedIn ? 'none' : '';
    profileDropdown.style.display = isLoggedIn ? '' : 'none';

    if (isLoggedIn && authState.user) {
      ensureNotificationFeed(authState.user.id);
      if (!notificationsLoaded) {
        void refreshNotificationList(authState.user.id);
      }
    } else {
      teardownNotifications();
    }

    // --- Publish dropdown content ---
    publishDropdownInner.innerHTML = '';
    const publishHeader = document.createElement('div');
    publishHeader.className = 'navbar-dropdown-header';
    const publishTitle = document.createElement('span');
    publishTitle.className = 'navbar-dropdown-header-title';
    publishTitle.textContent = 'Publicar';
    publishHeader.appendChild(publishTitle);

    if (isLoggedIn) {
      const videoItem = document.createElement('div');
      videoItem.className = 'navbar-dropdown-item';
      const videoText = document.createElement('span');
      videoText.className = 'navbar-dropdown-item-text';
      videoText.textContent = 'Subir video';
      videoItem.append(videoText);
      videoItem.addEventListener('click', () => {
        publishDropdown.classList.remove('open');
        navigate('/upload');
      });

      const postItem = document.createElement('div');
      postItem.className = 'navbar-dropdown-item';
      const postText = document.createElement('span');
      postText.className = 'navbar-dropdown-item-text';
      postText.textContent = 'Crear post';
      postItem.append(postText);
      postItem.addEventListener('click', () => {
        publishDropdown.classList.remove('open');
      });

      publishDropdownInner.append(publishHeader, videoItem, postItem);
    } else {
      const publishCta = document.createElement('div');
      publishCta.className = 'navbar-dropdown-cta';
      publishCta.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`;
      const publishCtaText = document.createElement('p');
      publishCtaText.textContent = 'Crea una cuenta en Vilo para comenzar a publicar contenido';
      const publishCtaBtn = document.createElement('button');
      publishCtaBtn.className = 'navbar-dropdown-cta-btn';
      publishCtaBtn.textContent = 'Crear cuenta';
      publishCtaBtn.addEventListener('click', () => {
        closeAllDropdowns();
        authModal.showRegister();
      });
      publishCta.append(publishCtaText, publishCtaBtn);
      publishDropdownInner.append(publishHeader, publishCta);
    }

    // --- Notification dropdown content ---
    renderNotificationDropdown(isLoggedIn);

    // --- Chat dropdown content ---
    chatDropdownInner.innerHTML = '';
    const chatHeader = document.createElement('div');
    chatHeader.className = 'navbar-dropdown-header';
    const chatTitle = document.createElement('span');
    chatTitle.className = 'navbar-dropdown-header-title';
    chatTitle.textContent = 'Mensajes';
    chatHeader.appendChild(chatTitle);

    if (isLoggedIn) {
      const chatUnreadCount = chats.filter(c => c.unread).length;
      chatBadge.textContent = String(chatUnreadCount);
      chatBadge.style.display = chatUnreadCount === 0 ? 'none' : '';

      chatDropdownInner.appendChild(chatHeader);

      chats.forEach(c => {
        const item = document.createElement('div');
        item.className = 'navbar-dropdown-item' + (c.unread ? ' unread' : '');

        const avatar = document.createElement('div');
        avatar.className = 'navbar-dropdown-item-avatar';
        avatar.style.background = hashColor(c.name);
        avatar.textContent = c.name.charAt(0).toUpperCase();

        const content = document.createElement('div');
        content.className = 'navbar-dropdown-item-content';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'navbar-dropdown-item-text';
        nameSpan.innerHTML = `<strong>${c.name}</strong>`;
        const msgSpan = document.createElement('span');
        msgSpan.className = 'navbar-dropdown-item-text';
        msgSpan.textContent = c.message;
        const time = document.createElement('span');
        time.className = 'navbar-dropdown-item-time';
        time.textContent = c.time;
        content.append(nameSpan, msgSpan, time);

        item.append(avatar, content);
        if (c.unread) {
          const dot = document.createElement('span');
          dot.className = 'navbar-dropdown-unread-dot';
          item.appendChild(dot);
        }
        chatDropdownInner.appendChild(item);
      });

      const chatFooter = document.createElement('div');
      chatFooter.className = 'navbar-dropdown-footer';
      chatFooter.textContent = 'Ver todos los mensajes';
      chatDropdownInner.appendChild(chatFooter);
    } else {
      chatBadge.style.display = 'none';

      const chatCta = document.createElement('div');
      chatCta.className = 'navbar-dropdown-cta';
      chatCta.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
      const chatCtaText = document.createElement('p');
      chatCtaText.textContent = 'Crea una cuenta en Vilo para enviar y recibir mensajes';
      const chatCtaBtn = document.createElement('button');
      chatCtaBtn.className = 'navbar-dropdown-cta-btn';
      chatCtaBtn.textContent = 'Crear cuenta';
      chatCtaBtn.addEventListener('click', () => {
        closeAllDropdowns();
        authModal.showRegister();
      });
      chatCta.append(chatCtaText, chatCtaBtn);
      chatDropdownInner.append(chatHeader, chatCta);
    }

    // --- Profile dropdown content ---
    profileDropdownInner.innerHTML = '';
    if (isLoggedIn) {
      const userName = profile?.display_name || 'Usuario';
      const userEmail = profile?.email || '';
      const userAvatarUrl = profile?.avatar_url
        || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || 'user'}`;

      const header = document.createElement('div');
      header.className = 'profile-dropdown-header';
      const headerImg = document.createElement('img');
      headerImg.className = 'profile-dropdown-avatar';
      headerImg.src = userAvatarUrl;
      headerImg.alt = userName;
      const headerInfo = document.createElement('div');
      headerInfo.className = 'profile-dropdown-info';
      const headerName = document.createElement('span');
      headerName.className = 'profile-dropdown-name';
      headerName.textContent = userName;
      const headerUsername = document.createElement('span');
      headerUsername.className = 'profile-dropdown-username';
      headerUsername.textContent = profile?.username ? `@${profile.username}` : '';
      const headerEmail = document.createElement('span');
      headerEmail.className = 'profile-dropdown-email';
      headerEmail.textContent = userEmail;
      headerInfo.append(headerName, headerUsername, headerEmail);
      header.append(headerImg, headerInfo);

      const hr = document.createElement('hr');

      const channelItem = document.createElement('div');
      channelItem.className = 'profile-dropdown-item';
      channelItem.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg><span>Tu canal</span>`;

      const switchItem = document.createElement('div');
      switchItem.className = 'profile-dropdown-item';
      switchItem.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><span>Cambiar de cuenta</span>`;

      const logoutItem = document.createElement('div');
      logoutItem.className = 'profile-dropdown-item';
      logoutItem.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg><span>Cerrar sesión</span>`;
      logoutItem.addEventListener('click', async () => {
        profileDropdown.classList.remove('open');
        await signOut();
      });

      profileDropdownInner.append(header, hr, channelItem, switchItem, logoutItem);
    }
  }

  // Initial render based on current auth state
  updateNavbarForAuth(getAuthState());

  // Subscribe to auth state changes
  const unsubscribeAuth = subscribe((authState) => {
    closeAllDropdowns();
    updateNavbarForAuth(authState);
  });

  // Cleanup realtime listeners when navbar is removed from DOM
  let mounted = false;
  const cleanupObserver = new MutationObserver(() => {
    if (!mounted) {
      if (document.contains(wrapper)) mounted = true;
      return;
    }
    if (!document.contains(wrapper)) {
      teardownNotifications();
      unsubscribeAuth();
      cleanupObserver.disconnect();
    }
  });
  cleanupObserver.observe(document.body, { childList: true, subtree: true });

  return wrapper;
}
