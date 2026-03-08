import { EventCallback } from '../../types';

export interface UserAvatarOptions {
  imageUrl?: string;
  alt?: string;
  onClick?: EventCallback;
}

export function UserAvatar(options: UserAvatarOptions = {}): HTMLDivElement {
  const { imageUrl = 'https://api.dicebear.com/7.x/avataaars/svg?seed=user', alt = 'Usuario', onClick } = options;

  const container = document.createElement('div');
  container.className = 'user-avatar';

  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = alt;

  container.appendChild(img);

  if (onClick) {
    container.addEventListener('click', onClick);
  }

  return container;
}
