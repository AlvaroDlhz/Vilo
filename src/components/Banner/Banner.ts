import './Banner.css';

export function Banner(): HTMLDivElement {
  const banner = document.createElement('div');
  banner.className = 'banner';
  banner.setAttribute('aria-label', 'Banner publicitario');

  const adLink = document.createElement('a');
  adLink.className = 'banner-ad-link';
  adLink.href = 'mailto:anuncios@vilo.app?subject=Quiero%20anunciar%20mi%20negocio%20en%20Vilo';
  adLink.setAttribute('aria-label', 'Anunciar mi negocio en el banner');

  const badge = document.createElement('span');
  badge.className = 'banner-ad-badge';
  badge.textContent = 'ESPACIO PUBLICITARIO';

  const title = document.createElement('h3');
  title.className = 'banner-ad-title';
  title.textContent = 'Promociona tu negocio en este banner';

  const text = document.createElement('p');
  text.className = 'banner-ad-text';
  text.textContent = 'Llega a mas personas dentro de Vilo con un anuncio destacado.';

  const cta = document.createElement('span');
  cta.className = 'banner-ad-cta';
  cta.textContent = 'Anunciar mi negocio';

  adLink.append(badge, title, text, cta);
  banner.appendChild(adLink);

  return banner;
}
