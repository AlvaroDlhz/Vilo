import { VideoData } from './videoStore';

export interface Feed {
  id: string;
  name: string;
  keywords: string[];
  channelNames: string[];
  isPredefined: boolean;
}

const STORAGE_KEY = 'vilo-custom-feeds';

const predefinedFeeds: Feed[] = [
  {
    id: 'all',
    name: 'Todos',
    keywords: [],
    channelNames: [],
    isPredefined: true,
  },
  {
    id: 'programming',
    name: 'Programación',
    keywords: ['programación', 'react', 'python', 'js', 'css', 'typescript'],
    channelNames: ['CodeMaster', 'CodeAcademy', 'DevFast', 'Dev Tutorials', 'Web Dev'],
    isPredefined: true,
  },
  {
    id: 'tech',
    name: 'Tech',
    keywords: ['review', 'unboxing', 'pc', 'producto'],
    channelNames: ['Tech Reviews', 'Tech Unbox', 'PC Builder'],
    isPredefined: true,
  },
  {
    id: 'entertainment',
    name: 'Entretenimiento',
    keywords: ['viral', 'fail', 'top 10', 'magia', 'películas'],
    channelNames: ['Trending Now', 'FailTube', 'CineFan', 'Magic Tricks'],
    isPredefined: true,
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle',
    keywords: ['cocina', 'receta', 'ejercicio', 'fitness', 'moda', 'fotografía'],
    channelNames: ['Chef Casero', 'Fitness Pro', 'StyleHub', 'PhotoPro', 'Life Hacks'],
    isPredefined: true,
  },
  {
    id: 'documentaries',
    name: 'Documentales',
    keywords: ['documental', 'naturaleza', 'historia', 'arte'],
    channelNames: ['Docs Channel', 'Nature Docs', 'ArtClass'],
    isPredefined: true,
  },
];

export function getPredefinedFeeds(): Feed[] {
  return predefinedFeeds;
}

export function getCustomFeeds(): Feed[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Feed[];
  } catch {
    return [];
  }
}

export function getAllFeeds(): Feed[] {
  return [...predefinedFeeds, ...getCustomFeeds()];
}

export function saveCustomFeed(feed: Feed): void {
  const customs = getCustomFeeds();
  customs.push(feed);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customs));
}

export function deleteCustomFeed(id: string): void {
  const customs = getCustomFeeds().filter(f => f.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customs));
}

export function filterVideosByFeed(feed: Feed, videos: VideoData[]): VideoData[] {
  if (feed.keywords.length === 0 && feed.channelNames.length === 0) {
    return videos;
  }

  return videos.filter(video => {
    const titleLower = video.title.toLowerCase();
    const matchesKeyword = feed.keywords.some(kw => titleLower.includes(kw.toLowerCase()));
    const matchesChannel = feed.channelNames.includes(video.channelName);
    return matchesKeyword || matchesChannel;
  });
}
