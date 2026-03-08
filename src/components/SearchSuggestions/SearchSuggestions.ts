import './SearchSuggestions.css';
import { getAllVideos } from '../../data/videoStore';
import { getAllChannels } from '../../data/channelStore';
import { hashColor } from '../../utils/avatarColor';

const gradientClasses = [
  'gradient-1', 'gradient-2', 'gradient-3', 'gradient-4',
  'gradient-5', 'gradient-6', 'gradient-7', 'gradient-8',
];

export interface SearchSuggestionsOptions {
  onSelect?: (text: string) => void;
}

export interface SearchSuggestionsInstance {
  getElement(): HTMLDivElement;
  update(query: string): void;
  hide(): void;
}

export function SearchSuggestions(options: SearchSuggestionsOptions = {}): SearchSuggestionsInstance {
  const { onSelect } = options;

  const container = document.createElement('div');
  container.className = 'search-suggestions';

  function hide() {
    container.classList.remove('visible');
  }

  function show() {
    container.classList.add('visible');
  }

  function update(query: string) {
    const trimmed = query.trim().toLowerCase();
    container.innerHTML = '';

    if (!trimmed) {
      hide();
      return;
    }

    const results: { type: 'channel' | 'video'; text: string; gradientIndex: number }[] = [];
    const seenChannels = new Set<string>();

    // Channels first
    for (const channel of getAllChannels()) {
      if (results.length >= 8) break;
      if (channel.name.toLowerCase().includes(trimmed)) {
        if (!seenChannels.has(channel.name)) {
          seenChannels.add(channel.name);
          results.push({ type: 'channel', text: channel.name, gradientIndex: channel.bannerGradientIndex });
        }
      }
    }

    // Then videos
    for (const video of getAllVideos()) {
      if (results.length >= 8) break;
      if (video.title.toLowerCase().includes(trimmed)) {
        results.push({ type: 'video', text: video.title, gradientIndex: video.gradientIndex });
      }
    }

    if (results.length === 0) {
      hide();
      return;
    }

    for (const result of results) {
      const row = document.createElement('div');
      row.className = 'search-suggestion';

      const thumb = document.createElement('div');
      thumb.className = 'search-suggestion-thumb';

      if (result.type === 'video') {
        const gradientClass = gradientClasses[result.gradientIndex % gradientClasses.length];
        thumb.classList.add('search-suggestion-thumb--video', gradientClass);
      } else {
        thumb.classList.add('search-suggestion-thumb--channel');
        thumb.style.background = hashColor(result.text);
        thumb.textContent = result.text.charAt(0).toUpperCase();
      }

      const info = document.createElement('div');
      info.className = 'search-suggestion-info';

      const title = document.createElement('span');
      title.className = 'search-suggestion-title';
      title.textContent = result.text;

      const type = document.createElement('span');
      type.className = 'search-suggestion-type';
      type.textContent = result.type === 'video' ? 'Video' : 'Canal';

      info.append(title, type);
      row.append(thumb, info);

      row.addEventListener('click', () => {
        if (onSelect) {
          onSelect(result.text);
        }
      });

      container.appendChild(row);
    }

    show();
  }

  return {
    getElement: () => container,
    update,
    hide,
  };
}
