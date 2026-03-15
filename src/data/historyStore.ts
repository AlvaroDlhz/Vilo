import { supabase } from '../lib/supabase';
import { getAuthState } from './authStore';

interface HistoryItem {
  videoId: string;
  watchedAt: string;
}

const HISTORY_STORAGE_PREFIX = 'vilo_watch_history_v1';
const MAX_HISTORY_ITEMS = 300;
const syncedUsers = new Set<string>();

function isLikelyUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getHistoryStorageKeyByUser(userId: string | null): string {
  return `${HISTORY_STORAGE_PREFIX}:${userId || 'guest'}`;
}

function readHistoryItemsByUser(userId: string | null): HistoryItem[] {
  try {
    const raw = localStorage.getItem(getHistoryStorageKeyByUser(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryItem[];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item) => (
      typeof item?.videoId === 'string'
      && typeof item?.watchedAt === 'string'
      && item.videoId.length > 0
    ));
  } catch {
    return [];
  }
}

function writeHistoryItemsByUser(userId: string | null, items: HistoryItem[]) {
  localStorage.setItem(getHistoryStorageKeyByUser(userId), JSON.stringify(items));
}

function getHistoryStorageKey(): string {
  const userId = getAuthState().user?.id || 'guest';
  return getHistoryStorageKeyByUser(userId);
}

function readHistoryItems(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(getHistoryStorageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryItem[];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item) => (
      typeof item?.videoId === 'string'
      && typeof item?.watchedAt === 'string'
      && item.videoId.length > 0
    ));
  } catch {
    return [];
  }
}

function writeHistoryItems(items: HistoryItem[]) {
  localStorage.setItem(getHistoryStorageKey(), JSON.stringify(items));
}

async function syncLocalHistoryToRemote(userId: string): Promise<void> {
  if (syncedUsers.has(userId)) return;

  const userItems = readHistoryItemsByUser(userId);
  const guestItems = readHistoryItemsByUser(null);
  const latestByVideo = new Map<string, HistoryItem>();

  [...userItems, ...guestItems].forEach((item) => {
    if (!isLikelyUuid(item.videoId)) return;
    const existing = latestByVideo.get(item.videoId);
    if (!existing || new Date(item.watchedAt).getTime() > new Date(existing.watchedAt).getTime()) {
      latestByVideo.set(item.videoId, item);
    }
  });

  const rows = Array.from(latestByVideo.values()).map((item) => ({
    user_id: userId,
    video_id: item.videoId,
    watched_at: item.watchedAt,
  }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from('watch_history')
      .upsert(rows, { onConflict: 'user_id,video_id' });

    if (error) {
      console.warn('[historyStore] syncLocalHistoryToRemote failed:', error.message);
      return;
    }
  }

  if (guestItems.length > 0) {
    localStorage.removeItem(getHistoryStorageKeyByUser(null));
  }
  writeHistoryItemsByUser(userId, Array.from(latestByVideo.values()));
  syncedUsers.add(userId);
}

export async function recordWatchedVideo(videoId: string): Promise<void> {
  if (!videoId) return;

  const nowIso = new Date().toISOString();
  const current = readHistoryItems().filter((item) => item.videoId !== videoId);
  current.unshift({ videoId, watchedAt: nowIso });
  writeHistoryItems(current.slice(0, MAX_HISTORY_ITEMS));

  const userId = getAuthState().user?.id || null;
  if (!userId || !isLikelyUuid(videoId)) return;

  try {
    await syncLocalHistoryToRemote(userId);
    const { error } = await supabase
      .from('watch_history')
      .upsert(
        { user_id: userId, video_id: videoId, watched_at: nowIso },
        { onConflict: 'user_id,video_id' },
      );

    if (error) {
      console.warn('[historyStore] recordWatchedVideo remote upsert failed:', error.message);
    }
  } catch (err) {
    console.warn('[historyStore] recordWatchedVideo failed:', err);
  }
}

export async function getWatchedVideoIds(limit = 200): Promise<string[]> {
  const userId = getAuthState().user?.id || null;
  const localIds = readHistoryItems()
    .sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime())
    .slice(0, limit)
    .map((item) => item.videoId);

  if (!userId) return localIds;

  try {
    await syncLocalHistoryToRemote(userId);
    const { data, error } = await supabase
      .from('watch_history')
      .select('video_id')
      .eq('user_id', userId)
      .order('watched_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[historyStore] getWatchedVideoIds remote fetch failed:', error.message);
      return localIds;
    }

    const remoteIds = (data || []).map((row) => row.video_id as string).filter(Boolean);
    return remoteIds.length > 0 ? remoteIds : localIds;
  } catch (err) {
    console.warn('[historyStore] getWatchedVideoIds failed:', err);
    return localIds;
  }
}
