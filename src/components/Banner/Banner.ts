import './Banner.css';

export function Banner(): HTMLDivElement {
  const banner = document.createElement('div');
  banner.className = 'banner';
  banner.setAttribute('aria-label', 'Banner publicitario');

  return banner;
}
