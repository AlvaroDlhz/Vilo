import './VideoGrid.css';
import { VideoCard, VideoCardOptions } from '../VideoCard/VideoCard';

export interface VideoGridColumns {
  default?: number;
  tablet?: number;
  mobile?: number;
}

export interface VideoGridOptions {
  videos: VideoCardOptions[];
  columns?: VideoGridColumns;
}

export function VideoGrid(options: VideoGridOptions): HTMLDivElement {
  const { videos, columns = {} } = options;

  const grid = document.createElement('div');
  grid.className = 'video-grid';

  if (columns.default) {
    grid.style.setProperty('--columns-desktop', String(columns.default));
  }
  if (columns.tablet) {
    grid.style.setProperty('--columns-tablet', String(columns.tablet));
  }
  if (columns.mobile) {
    grid.style.setProperty('--columns-mobile', String(columns.mobile));
  }

  videos.forEach((video, index) => {
    const card = VideoCard(video);
    card.style.animationDelay = `${index * 0.05}s`;
    grid.appendChild(card);
  });

  return grid;
}
