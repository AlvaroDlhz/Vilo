import './MainContent.css';

export interface MainContentOptions {
  children?: HTMLElement[];
}

export function MainContent(options: MainContentOptions = {}): HTMLElement {
  const { children = [] } = options;

  const container = document.createElement('div');
  container.className = 'main-content';

  children.forEach(child => {
    container.appendChild(child);
  });

  return container;
}
