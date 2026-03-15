import { supabase } from '../lib/supabase';

export interface VideoData {
  id: string;
  userId: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  channelName: string;
  channelUsername: string;
  channelAvatar: string;
  views: string;
  uploadedAt: string;
  duration: string;
  gradientIndex: number;
  subscribers: string;
  likes: string;
  dislikes: string;
  publishedDate: string;
  category: string;
  tags: string[];
}

const videos: VideoData[] = [];
const videoMap = new Map<string, VideoData>();

export function getVideoById(id: string): VideoData | undefined {
  return videoMap.get(id);
}

export function getAllVideos(): VideoData[] {
  return videos;
}

export function getRecommendedVideos(currentId: string, count: number = 15): VideoData[] {
  return videos.filter(v => v.id !== currentId).slice(0, count);
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffMin < 1) return 'hace un momento';
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffHour < 24) return `hace ${diffHour} hora${diffHour > 1 ? 's' : ''}`;
  if (diffDay < 7) return `hace ${diffDay} día${diffDay > 1 ? 's' : ''}`;
  if (diffWeek < 5) return `hace ${diffWeek} semana${diffWeek > 1 ? 's' : ''}`;
  return `hace ${diffMonth} mes${diffMonth > 1 ? 'es' : ''}`;
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M vistas`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K vistas`;
  return `${n} vista${n !== 1 ? 's' : ''}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatSubscribers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M suscriptores`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K suscriptores`;
  if (n === 1) return '1 suscriptor';
  return `${n} suscriptores`;
}

function formatDurationFromSeconds(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function normalizeDuration(raw: unknown): string {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return formatDurationFromSeconds(raw);
  }

  if (typeof raw !== 'string') return '';
  const value = raw.trim();
  if (!value) return '';

  if (/^\d+$/.test(value)) {
    return formatDurationFromSeconds(Number(value));
  }

  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) {
    return value;
  }

  return '';
}

function toHandleBase(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]+/g, '')
    .slice(0, 24) || 'canal';
}

export async function initVideoStore(): Promise<void> {
  try {
    // Fetch published public videos
    const { data: rows, error } = await supabase
      .from('user_videos')
      .select('*')
      .eq('visibility', 'public')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!rows || rows.length === 0) return;

    // Fetch profiles for all video authors
    const userIds = [...new Set(rows.map(r => r.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url, subscriber_count')
      .in('id', userIds);

    const profileMap = new Map<string, {
      display_name: string;
      username: string;
      avatar_url: string | null;
      subscriber_count: number | null;
    }>();
    if (profiles) {
      for (const p of profiles) {
        profileMap.set(p.id, p);
      }
    }

    videos.length = 0;
    videoMap.clear();

    for (const row of rows) {
      const profile = profileMap.get(row.user_id);
      const channelName = profile?.display_name || profile?.username || 'Usuario';
      const channelUsername = profile?.username || toHandleBase(channelName);
      const channelAvatar = profile?.avatar_url
        || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || row.user_id}`;
      const channelSubscribers = formatSubscribers(profile?.subscriber_count ?? 0);

      const video: VideoData = {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        description: row.description || '',
        videoUrl: row.video_url || '',
        thumbnailUrl: row.thumbnail_url || '',
        channelName,
        channelUsername,
        channelAvatar,
        views: formatViews(row.view_count ?? 0),
        uploadedAt: timeAgo(row.created_at),
        duration: normalizeDuration(
          row.duration
          ?? row.duration_seconds
          ?? row.video_duration
          ?? row.length_seconds,
        ),
        gradientIndex: hashToIndex(row.id),
        subscribers: channelSubscribers,
        likes: String(row.likes ?? 0),
        dislikes: String(row.dislikes ?? 0),
        publishedDate: formatDate(row.created_at),
        category: row.category || '',
        tags: row.tags || [],
      };
      videos.push(video);
      videoMap.set(video.id, video);
    }

    console.log(`[videoStore] Loaded ${videos.length} videos from Supabase`);
  } catch (err) {
    console.warn('[videoStore] Failed to load videos:', err);
  }
}

function hashToIndex(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 8;
}
