export interface LogoOptions {
  brandName?: string;
  onClick?: () => void;
}

export function Logo(options: LogoOptions = {}): HTMLAnchorElement {
  const { brandName = 'Vilo', onClick } = options;

  const link = document.createElement('a');
  link.href = '#';
  link.className = 'navbar-logo';

  const eyeContainer = document.createElement('span');
  eyeContainer.className = 'eye-container';

  const eyeOpen = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  eyeOpen.setAttribute('class', 'eye eye-open');
  eyeOpen.setAttribute('viewBox', '0 0 16 16');
  eyeOpen.setAttribute('fill', 'none');
  eyeOpen.innerHTML = `
    <path fill-rule="evenodd" clip-rule="evenodd" d="M0 8L3.07945 4.30466C4.29638 2.84434 6.09909 2 8 2C9.90091 2 11.7036 2.84434 12.9206 4.30466L16 8L12.9206 11.6953C11.7036 13.1557 9.90091 14 8 14C6.09909 14 4.29638 13.1557 3.07945 11.6953L0 8ZM8 11C9.65685 11 11 9.65685 11 8C11 6.34315 9.65685 5 8 5C6.34315 5 5 6.34315 5 8C5 9.65685 6.34315 11 8 11Z" fill="currentColor"/>
  `;

  const eyeClosed = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  eyeClosed.setAttribute('class', 'eye eye-closed');
  eyeClosed.setAttribute('viewBox', '0 0 24 24');
  eyeClosed.setAttribute('fill', 'none');
  eyeClosed.innerHTML = `
    <path d="M21.0006 12.0007C19.2536 15.5766 15.8779 18 12 18M12 18C8.12204 18 4.7463 15.5766 2.99977 12.0002M12 18L12 21M19.4218 14.4218L21.4999 16.5M16.2304 16.9687L17.5 19.5M4.57812 14.4218L2.5 16.5M7.76953 16.9687L6.5 19.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  `;

  eyeContainer.appendChild(eyeOpen);
  eyeContainer.appendChild(eyeClosed);

  const text = document.createElement('span');
  text.className = 'logo-text';
  text.textContent = brandName;

  link.appendChild(eyeContainer);
  link.appendChild(text);

  if (onClick) {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      onClick();
    });
  }

  return link;
}
