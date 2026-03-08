import './Navbar.css';
import { MenuButton } from '../MenuButton/MenuButton';
import { Logo } from '../Logo/Logo';
import { SearchBar } from '../SearchBar/SearchBar';
import { UserAvatar } from '../UserAvatar/UserAvatar';
import { FeedsMenu } from '../FeedsMenu/FeedsMenu';
import { Feed } from '../../data/feedStore';
import { hashColor } from '../../utils/avatarColor';
import plusIcon from '/assets/plus.svg?raw';
import notifIcon from '/assets/notifications.svg?raw';
import chatIcon from '/assets/chat.svg?raw';
import voiceIcon from '/assets/voice.svg?raw';

export interface NavbarOptions {
  brandName?: string;
  searchPlaceholder?: string;
  userAvatarUrl?: string;
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
    userAvatarUrl = 'https://api.dicebear.com/7.x/avataaars/svg?seed=user',
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
    console.log('Abrir menú lateral');
    onMenuClick?.();
  });

  const navbar = document.createElement('nav');
  navbar.className = 'navbar';

  const logo = Logo({
    brandName,
    onClick: () => {
      console.log('Click en logo');
      onLogoClick?.();
    },
  });

  const searchBar = SearchBar({
    placeholder: searchPlaceholder,
    onInput: (e) => {
      const value = (e.target as HTMLInputElement).value;
      console.log('Buscando:', value);
      onSearchInput?.(value);
    },
  });

  const publishBtn = document.createElement('button');
  publishBtn.className = 'publish-btn';
  publishBtn.innerHTML = `${plusIcon}<span>Publicar</span>`;
  publishBtn.addEventListener('click', () => {
    console.log('Click en publicar');
    onPublishClick?.();
  });

  const userAvatar = UserAvatar({
    imageUrl: userAvatarUrl,
  });

  // Profile dropdown
  const dropdown = document.createElement('div');
  dropdown.className = 'profile-dropdown';
  dropdown.innerHTML = `
    <div class="profile-dropdown-header">
      <img class="profile-dropdown-avatar" src="${userAvatarUrl}" alt="Usuario" />
      <div class="profile-dropdown-info">
        <span class="profile-dropdown-name">Usuario</span>
        <span class="profile-dropdown-email">usuario@email.com</span>
      </div>
    </div>
    <hr />
    <div class="profile-dropdown-item">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
      <span>Tu canal</span>
    </div>
    <div class="profile-dropdown-item">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      <span>Cambiar de cuenta</span>
    </div>
    <div class="profile-dropdown-item">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      <span>Cerrar sesión</span>
    </div>
  `;

  // --- Sample data ---
  const notifications = [
    { name: 'TechCode', text: 'TechCode subió: Nuevo tutorial de TypeScript', time: 'Hace 20 min', unread: true },
    { name: 'María López', text: 'María López comentó en tu video', time: 'Hace 1 hora', unread: true },
    { name: 'Carlos García', text: 'Carlos García le dio like a tu comentario', time: 'Hace 3 horas', unread: false },
    { name: 'Ana Martínez', text: 'Ana Martínez respondió a tu comentario', time: 'Hace 5 horas', unread: true },
    { name: 'Vilo', text: 'Tu video alcanzó 1K vistas', time: 'Ayer', unread: false },
    { name: 'Pedro Sánchez', text: 'Pedro Sánchez se suscribió a tu canal', time: 'Hace 2 días', unread: false },
  ];

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

  const notifUnreadCount = notifications.filter(n => n.unread).length;
  const notifBadge = document.createElement('span');
  notifBadge.className = 'navbar-dropdown-badge';
  notifBadge.textContent = String(notifUnreadCount);
  if (notifUnreadCount === 0) notifBadge.style.display = 'none';

  const notifDropdown = document.createElement('div');
  notifDropdown.className = 'navbar-dropdown';

  const notifHeader = document.createElement('div');
  notifHeader.className = 'navbar-dropdown-header';
  const notifTitle = document.createElement('span');
  notifTitle.className = 'navbar-dropdown-header-title';
  notifTitle.textContent = 'Notificaciones';
  const markReadBtn = document.createElement('button');
  markReadBtn.className = 'navbar-dropdown-header-action';
  markReadBtn.textContent = 'Marcar como leídas';
  notifHeader.append(notifTitle, markReadBtn);

  notifications.forEach(n => {
    const item = document.createElement('div');
    item.className = 'navbar-dropdown-item' + (n.unread ? ' unread' : '');

    const avatar = document.createElement('div');
    avatar.className = 'navbar-dropdown-item-avatar';
    avatar.style.background = hashColor(n.name);
    avatar.textContent = n.name.charAt(0).toUpperCase();

    const content = document.createElement('div');
    content.className = 'navbar-dropdown-item-content';
    const text = document.createElement('span');
    text.className = 'navbar-dropdown-item-text';
    text.textContent = n.text;
    const time = document.createElement('span');
    time.className = 'navbar-dropdown-item-time';
    time.textContent = n.time;
    content.append(text, time);

    item.append(avatar, content);
    if (n.unread) {
      const dot = document.createElement('span');
      dot.className = 'navbar-dropdown-unread-dot';
      item.appendChild(dot);
    }
    notifDropdown.appendChild(item);
  });

  const notifFooter = document.createElement('div');
  notifFooter.className = 'navbar-dropdown-footer';
  notifFooter.textContent = 'Ver todas las notificaciones';

  notifDropdown.prepend(notifHeader);
  notifDropdown.appendChild(notifFooter);

  notifContainer.append(notifBtn, notifBadge, notifDropdown);

  // Mark as read
  markReadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notifDropdown.querySelectorAll('.navbar-dropdown-item.unread').forEach(item => {
      item.classList.remove('unread');
      const dot = item.querySelector('.navbar-dropdown-unread-dot');
      if (dot) dot.remove();
    });
    notifBadge.style.display = 'none';
  });

  // --- Chat dropdown ---
  const chatContainer = document.createElement('div');
  chatContainer.className = 'navbar-dropdown-container';

  const chatBtn = document.createElement('button');
  chatBtn.className = 'notif-btn';
  chatBtn.setAttribute('aria-label', 'Mensajes');
  chatBtn.innerHTML = chatIcon;

  const chatUnreadCount = chats.filter(c => c.unread).length;
  const chatBadge = document.createElement('span');
  chatBadge.className = 'navbar-dropdown-badge';
  chatBadge.textContent = String(chatUnreadCount);
  if (chatUnreadCount === 0) chatBadge.style.display = 'none';

  const chatDropdown = document.createElement('div');
  chatDropdown.className = 'navbar-dropdown';

  const chatHeader = document.createElement('div');
  chatHeader.className = 'navbar-dropdown-header';
  const chatTitle = document.createElement('span');
  chatTitle.className = 'navbar-dropdown-header-title';
  chatTitle.textContent = 'Mensajes';
  chatHeader.appendChild(chatTitle);

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
    chatDropdown.appendChild(item);
  });

  const chatFooter = document.createElement('div');
  chatFooter.className = 'navbar-dropdown-footer';
  chatFooter.textContent = 'Ver todos los mensajes';

  chatDropdown.prepend(chatHeader);
  chatDropdown.appendChild(chatFooter);

  chatContainer.append(chatBtn, chatBadge, chatDropdown);

  // --- Toggle & coordination ---
  notifBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notifDropdown.classList.toggle('open');
    chatDropdown.classList.remove('open');
    dropdown.classList.remove('open');
  });

  chatBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    chatDropdown.classList.toggle('open');
    notifDropdown.classList.remove('open');
    dropdown.classList.remove('open');
  });

  userAvatar.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
    notifDropdown.classList.remove('open');
    chatDropdown.classList.remove('open');
    console.log('Abrir perfil de usuario');
    onUserClick?.();
  });

  document.addEventListener('click', (e) => {
    const target = e.target as Node;
    if (!dropdown.contains(target) && !userAvatar.contains(target)) {
      dropdown.classList.remove('open');
    }
    if (!notifDropdown.contains(target) && !notifBtn.contains(target)) {
      notifDropdown.classList.remove('open');
    }
    if (!chatDropdown.contains(target) && !chatBtn.contains(target)) {
      chatDropdown.classList.remove('open');
    }
  });

  const navbarRight = document.createElement('div');
  navbarRight.className = 'navbar-right';
  navbarRight.append(chatContainer, notifContainer, publishBtn);

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
  wrapper.appendChild(dropdown);

  return wrapper;
}
