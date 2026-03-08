import './ChannelTabs.css';

export interface ChannelTabsOptions {
  channelId: string;
  activeTab: string;
}

const tabs = [
  { key: 'videos', label: 'Videos' },
  { key: 'playlists', label: 'Playlists' },
  { key: 'community', label: 'Comunidad' },
  { key: 'about', label: 'Acerca de' },
];

export function ChannelTabs(options: ChannelTabsOptions): HTMLElement {
  const { channelId, activeTab } = options;

  const nav = document.createElement('nav');
  nav.className = 'channel-tabs';

  tabs.forEach(tab => {
    const a = document.createElement('a');
    a.className = 'channel-tab';
    if (tab.key === activeTab) {
      a.classList.add('channel-tab--active');
    }
    a.href = `#/channel/${channelId}/${tab.key}`;
    a.textContent = tab.label;
    nav.appendChild(a);
  });

  return nav;
}
