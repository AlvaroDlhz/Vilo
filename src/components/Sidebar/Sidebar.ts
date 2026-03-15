import './Sidebar.css';
import { subscribe, getAuthState } from '../../data/authStore';
import { getUserSubscriptions } from '../../lib/subscriptions';
import { hashColor } from '../../utils/avatarColor';
import { navigate } from '../../router/router';

export interface SidebarOptions {
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

const SUN_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
const MOON_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
const PALETTE_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor"/><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor"/><circle cx="6.5" cy="12" r="0.5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`;
const SUBSCRIPTIONS_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
const HISTORY_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
const BOOKMARK_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
const HEART_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
const SETTINGS_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
const HELP_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
const QUESTION_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
const FLAG_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`;
const FILE_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
const PLAY_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
const MUSIC_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;

function getCurrentTheme(): string {
  return localStorage.getItem('vilo-theme') || 'default';
}

function applyTheme(theme: string) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem('vilo-theme', theme);
}

export class Sidebar {
  private element: HTMLElement;
  private isOpen: boolean = false;
  private onOpenCallback?: () => void;
  private onCloseCallback?: () => void;
  private documentClickHandler: (e: MouseEvent) => void;
  private escapeHandler: (e: KeyboardEvent) => void;
  private appearanceSection: HTMLElement;
  private themeOptions: HTMLElement;
  private subscriptionsSection: HTMLElement;
  private librarySection: HTMLElement;
  private libraryList: HTMLElement;
  private settingsSection: HTMLElement;
  private helpSection: HTMLElement;
  private helpList: HTMLElement;
  private originalsSection: HTMLElement;
  private originalsList: HTMLElement;
  private subscriptionsList: HTMLElement;
  private cachedSubscriptions: Awaited<ReturnType<typeof getUserSubscriptions>> = [];

  constructor(options: SidebarOptions = {}) {
    this.isOpen = options.isOpen ?? false;
    this.onOpenCallback = options.onOpen;
    this.onCloseCallback = options.onClose;

    this.appearanceSection = document.createElement('div');
    this.themeOptions = document.createElement('div');
    this.subscriptionsSection = document.createElement('div');
    this.librarySection = document.createElement('div');
    this.libraryList = document.createElement('div');
    this.settingsSection = document.createElement('div');
    this.helpSection = document.createElement('div');
    this.helpList = document.createElement('div');
    this.originalsSection = document.createElement('div');
    this.originalsList = document.createElement('div');
    this.subscriptionsList = document.createElement('div');
    this.element = this.createElement();
    this.documentClickHandler = this.handleDocumentClick.bind(this);
    this.escapeHandler = this.handleEscape.bind(this);

    if (this.isOpen) {
      this.open();
    }

    this.setupKeyboardListener();
    this.setupAuthSubscription();
  }

  private createElement(): HTMLElement {
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';
    sidebar.setAttribute('aria-label', 'Menú lateral');

    if (this.isOpen) {
      sidebar.classList.add('open');
    }

    // Appearance section
    this.appearanceSection.className = 'sidebar-section sidebar-appearance';

    const appearanceBtn = document.createElement('button');
    appearanceBtn.className = 'sidebar-item sidebar-appearance-toggle';
    appearanceBtn.innerHTML = `${PALETTE_ICON}<span>Apariencia</span><svg class="sidebar-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

    this.themeOptions.className = 'sidebar-theme-options';
    this.buildThemeOptions();

    appearanceBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = this.themeOptions.classList.contains('expanded');
      this.themeOptions.classList.toggle('expanded', !isExpanded);
      appearanceBtn.classList.toggle('expanded', !isExpanded);
    });

    this.appearanceSection.append(appearanceBtn, this.themeOptions);

    // Subscriptions section
    this.subscriptionsSection.className = 'sidebar-section sidebar-subscriptions';

    const subscriptionsBtn = document.createElement('button');
    subscriptionsBtn.className = 'sidebar-item sidebar-subscriptions-toggle';
    subscriptionsBtn.innerHTML = `${SUBSCRIPTIONS_ICON}<span>Suscripciones</span><svg class="sidebar-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

    this.subscriptionsList.className = 'sidebar-subscriptions-list';

    subscriptionsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = this.subscriptionsList.classList.contains('expanded');
      this.subscriptionsList.classList.toggle('expanded', !isExpanded);
      subscriptionsBtn.classList.toggle('expanded', !isExpanded);
      if (!isExpanded) this.renderSubscriptions();
    });

    this.subscriptionsSection.append(subscriptionsBtn, this.subscriptionsList);

    // Library section
    this.librarySection.className = 'sidebar-section sidebar-library';
    this.libraryList.className = 'sidebar-library-list';

    const libraryBtn = document.createElement('button');
    libraryBtn.className = 'sidebar-item sidebar-library-toggle';
    libraryBtn.innerHTML = `${HISTORY_ICON}<span>Biblioteca</span><svg class="sidebar-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

    const libraryItems = [
      { id: 'history', label: 'Historial', icon: HISTORY_ICON },
      { id: 'watchLater', label: 'Guardados', icon: BOOKMARK_ICON },
      { id: 'liked', label: 'Me gusta', icon: HEART_ICON },
    ];

    libraryItems.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'sidebar-library-item';
      btn.innerHTML = `${item.icon}<span>${item.label}</span>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (item.id === 'history') {
          navigate('/history');
          this.close();
          return;
        }
        if (item.id === 'watchLater') {
          navigate('/saved');
          this.close();
          return;
        }
        console.log(`Navegar a: ${item.id}`);
      });
      this.libraryList.appendChild(btn);
    });

    libraryBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = this.libraryList.classList.contains('expanded');
      this.libraryList.classList.toggle('expanded', !isExpanded);
      libraryBtn.classList.toggle('expanded', !isExpanded);
    });

    this.librarySection.append(libraryBtn, this.libraryList);

    // Vilo Originals section
    this.originalsSection.className = 'sidebar-section sidebar-originals';
    this.originalsList.className = 'sidebar-originals-list';

    const originalsBtn = document.createElement('button');
    originalsBtn.className = 'sidebar-item sidebar-originals-toggle';
    originalsBtn.innerHTML = `${PLAY_ICON}<span>Vilo Originals</span><svg class="sidebar-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

    const originalsItems = [
      { id: 'vilo-under', label: 'Vilo Under', icon: PLAY_ICON },
      { id: 'vilo-music', label: 'Vilo Music', icon: MUSIC_ICON },
    ];

    originalsItems.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'sidebar-originals-item';
      btn.innerHTML = `${item.icon}<span>${item.label}</span>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log(`Navegar a: ${item.id}`);
      });
      this.originalsList.appendChild(btn);
    });

    originalsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = this.originalsList.classList.contains('expanded');
      this.originalsList.classList.toggle('expanded', !isExpanded);
      originalsBtn.classList.toggle('expanded', !isExpanded);
    });

    this.originalsSection.append(originalsBtn, this.originalsList);

    // Settings section
    this.settingsSection.className = 'sidebar-section sidebar-settings';

    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'sidebar-item sidebar-settings-toggle';
    settingsBtn.innerHTML = `${SETTINGS_ICON}<span>Configuración</span>`;

    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('Navegar a: Configuración');
    });

    this.settingsSection.appendChild(settingsBtn);

    // Help section
    this.helpSection.className = 'sidebar-section sidebar-help';

    const helpBtn = document.createElement('button');
    helpBtn.className = 'sidebar-item sidebar-help-toggle';
    helpBtn.innerHTML = `${HELP_ICON}<span>Ayuda</span><svg class="sidebar-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

    this.helpList.className = 'sidebar-help-list';

    const helpItems = [
      { id: 'faq', label: 'FAQ / Centro de ayuda', icon: QUESTION_ICON },
      { id: 'report', label: 'Reportar problema', icon: FLAG_ICON },
      { id: 'terms', label: 'Términos y privacidad', icon: FILE_ICON },
    ];

    helpItems.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'sidebar-help-item';
      btn.innerHTML = `${item.icon}<span>${item.label}</span>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log(`Navegar a: ${item.id}`);
      });
      this.helpList.appendChild(btn);
    });

    helpBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = this.helpList.classList.contains('expanded');
      this.helpList.classList.toggle('expanded', !isExpanded);
      helpBtn.classList.toggle('expanded', !isExpanded);
    });

    this.helpSection.append(helpBtn, this.helpList);

    // Show/hide based on current auth state
    const { isLoggedIn } = getAuthState();
    this.subscriptionsSection.style.display = isLoggedIn ? '' : 'none';
    this.librarySection.style.display = isLoggedIn ? '' : 'none';
    this.settingsSection.style.display = isLoggedIn ? '' : 'none';
    this.appearanceSection.style.display = isLoggedIn ? '' : 'none';

    sidebar.append(this.subscriptionsSection, this.librarySection, this.originalsSection, this.settingsSection, this.helpSection, this.appearanceSection);

    return sidebar;
  }

  private buildThemeOptions() {
    this.themeOptions.innerHTML = '';
    const current = getCurrentTheme();

    const options = [
      { id: 'default', label: 'Predeterminado', icon: SUN_ICON },
      { id: 'dark', label: 'Modo oscuro', icon: MOON_ICON },
    ];

    options.forEach(opt => {
      const item = document.createElement('button');
      item.className = 'sidebar-theme-item' + (current === opt.id ? ' active' : '');
      item.innerHTML = `${opt.icon}<span>${opt.label}</span>`;

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        applyTheme(opt.id);
        // Update active state
        this.themeOptions.querySelectorAll('.sidebar-theme-item').forEach(el =>
          el.classList.remove('active')
        );
        item.classList.add('active');
      });

      this.themeOptions.appendChild(item);
    });
  }

  async refreshSubscriptions() {
    this.cachedSubscriptions = await getUserSubscriptions();
    if (this.subscriptionsList.classList.contains('expanded')) {
      this.renderSubscriptions();
    }
  }

  private renderSubscriptions() {
    this.subscriptionsList.innerHTML = '';

    if (this.cachedSubscriptions.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'sidebar-subscriptions-empty';
      empty.textContent = 'No tienes suscripciones';
      this.subscriptionsList.appendChild(empty);
      return;
    }

    this.cachedSubscriptions.forEach(ch => {
      const item = document.createElement('button');
      item.className = 'sidebar-subscription-item';

      const avatar = document.createElement('div');
      avatar.className = 'sidebar-subscription-avatar';
      if (ch.avatarUrl) {
        const img = document.createElement('img');
        img.src = ch.avatarUrl;
        img.alt = ch.displayName;
        avatar.appendChild(img);
      } else {
        avatar.textContent = ch.displayName.charAt(0).toUpperCase();
        avatar.style.background = hashColor(ch.displayName);
      }

      const name = document.createElement('span');
      name.className = 'sidebar-subscription-name';
      name.textContent = ch.displayName;

      item.append(avatar, name);
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        navigate(`/channel/${ch.userId}`);
        this.close();
      });

      this.subscriptionsList.appendChild(item);
    });
  }

  private setupAuthSubscription() {
    subscribe((state) => {
      this.subscriptionsSection.style.display = state.isLoggedIn ? '' : 'none';
      this.librarySection.style.display = state.isLoggedIn ? '' : 'none';
      this.settingsSection.style.display = state.isLoggedIn ? '' : 'none';
      this.appearanceSection.style.display = state.isLoggedIn ? '' : 'none';
      if (state.isLoggedIn) {
        this.refreshSubscriptions();
      } else {
        this.cachedSubscriptions = [];
        this.subscriptionsList.classList.remove('expanded');
        this.subscriptionsList.innerHTML = '';
      }
    });

    // Pre-cargar si ya está logueado al crear el sidebar
    if (getAuthState().isLoggedIn) {
      this.refreshSubscriptions();
    }
  }

  private setupKeyboardListener(): void {
    document.addEventListener('keydown', this.escapeHandler);
  }

  private handleEscape(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.isOpen) {
      this.close();
    }
  }

  private handleDocumentClick(e: MouseEvent): void {
    if (this.isOpen && !this.element.contains(e.target as Node)) {
      const target = e.target as HTMLElement;
      if (!target.closest('.menu-btn')) {
        this.close();
      }
    }
  }

  open(): void {
    this.isOpen = true;
    this.element.classList.add('open');
    document.addEventListener('click', this.documentClickHandler);
    this.onOpenCallback?.();
  }

  close(): void {
    this.isOpen = false;
    this.element.classList.remove('open');
    document.removeEventListener('click', this.documentClickHandler);
    this.onCloseCallback?.();
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    document.removeEventListener('click', this.documentClickHandler);
    document.removeEventListener('keydown', this.escapeHandler);
  }
}
