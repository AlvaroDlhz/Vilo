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
  private subscriptionsList: HTMLElement;
  private cachedSubscriptions: Awaited<ReturnType<typeof getUserSubscriptions>> = [];

  constructor(options: SidebarOptions = {}) {
    this.isOpen = options.isOpen ?? false;
    this.onOpenCallback = options.onOpen;
    this.onCloseCallback = options.onClose;

    this.appearanceSection = document.createElement('div');
    this.themeOptions = document.createElement('div');
    this.subscriptionsSection = document.createElement('div');
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

    // Show/hide based on current auth state
    const { isLoggedIn } = getAuthState();
    this.subscriptionsSection.style.display = isLoggedIn ? '' : 'none';
    this.appearanceSection.style.display = isLoggedIn ? '' : 'none';

    sidebar.append(this.subscriptionsSection, this.appearanceSection);

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
        navigate(`/channel/${ch.username || ch.userId}`);
        this.close();
      });

      this.subscriptionsList.appendChild(item);
    });
  }

  private setupAuthSubscription() {
    subscribe((state) => {
      this.subscriptionsSection.style.display = state.isLoggedIn ? '' : 'none';
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
