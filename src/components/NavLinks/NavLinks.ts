import { NavLink } from '../../types';

export interface NavLinksOptions {
  links: NavLink[];
  onLinkClick?: (label: string, event: Event) => void;
}

export function NavLinks(options: NavLinksOptions): HTMLUListElement {
  const { links, onLinkClick } = options;

  const ul = document.createElement('ul');
  ul.className = 'navbar-links';

  links.forEach((link) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = link.href;
    a.textContent = link.label;

    if (onLinkClick) {
      a.addEventListener('click', (e) => onLinkClick(link.label, e));
    }

    li.appendChild(a);
    ul.appendChild(li);
  });

  return ul;
}
