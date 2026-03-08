import { EventCallback } from '../../types';

export function MenuButton(onClick?: EventCallback): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'menu-btn';
  button.setAttribute('aria-label', 'Menú');
  
  button.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  `;

  if (onClick) {
    button.addEventListener('click', onClick);
  }

  return button;
}
