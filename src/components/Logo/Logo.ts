export interface LogoOptions {
  brandName?: string;
  onClick?: () => void;
}

export function Logo(options: LogoOptions = {}): HTMLAnchorElement {
  const { brandName = 'Vilo', onClick } = options;
  const irisStates = ['normal', 'play', 'pause'] as const;
  let irisIndex = 0;

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
    <path d="M0 8L3.07945 4.30466C4.29638 2.84434 6.09909 2 8 2C9.90091 2 11.7036 2.84434 12.9206 4.30466L16 8L12.9206 11.6953C11.7036 13.1557 9.90091 14 8 14C6.09909 14 4.29638 13.1557 3.07945 11.6953L0 8Z" fill="currentColor"/>
    <circle class="eye-iris-shape iris-normal" cx="8" cy="8" r="2.6"/>
    <path class="eye-iris-shape iris-play" d="M6.5 5.9L11.3 8L6.5 10.1V5.9Z"/>
    <rect class="eye-iris-shape iris-pause" x="5.95" y="5.9" width="1.65" height="4.2" rx="0.45"/>
    <rect class="eye-iris-shape iris-pause" x="8.4" y="5.9" width="1.65" height="4.2" rx="0.45"/>
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
  eyeContainer.dataset.iris = irisStates[0];

  const advanceIrisState = () => {
    irisIndex = (irisIndex + 1) % irisStates.length;
    eyeContainer.dataset.iris = irisStates[irisIndex];
  };

  const handleBlinkIteration = () => {
    advanceIrisState();
  };

  eyeOpen.addEventListener('animationiteration', handleBlinkIteration);

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

  let mounted = false;
  const cleanupObserver = new MutationObserver(() => {
    if (!mounted) {
      if (document.contains(link)) mounted = true;
      return;
    }
    if (!document.contains(link)) {
      eyeOpen.removeEventListener('animationiteration', handleBlinkIteration);
      cleanupObserver.disconnect();
    }
  });
  cleanupObserver.observe(document.body, { childList: true, subtree: true });

  return link;
}
