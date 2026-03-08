import './Sidebar.css';

export interface SidebarOptions {
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export class Sidebar {
  private element: HTMLElement;
  private isOpen: boolean = false;
  private onOpenCallback?: () => void;
  private onCloseCallback?: () => void;
  private documentClickHandler: (e: MouseEvent) => void;
  private escapeHandler: (e: KeyboardEvent) => void;

  constructor(options: SidebarOptions = {}) {
    this.isOpen = options.isOpen ?? false;
    this.onOpenCallback = options.onOpen;
    this.onCloseCallback = options.onClose;

    this.element = this.createElement();
    this.documentClickHandler = this.handleDocumentClick.bind(this);
    this.escapeHandler = this.handleEscape.bind(this);

    if (this.isOpen) {
      this.open();
    }

    this.setupKeyboardListener();
  }

  private createElement(): HTMLElement {
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';
    sidebar.setAttribute('aria-label', 'Menú lateral');

    if (this.isOpen) {
      sidebar.classList.add('open');
    }

    return sidebar;
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
