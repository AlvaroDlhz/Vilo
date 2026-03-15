import { getAuthState } from './authStore';

export interface SavedVideoList {
  id: string;
  name: string;
  videoIds: string[];
  createdAt: string;
  updatedAt: string;
}

const SAVED_STORAGE_PREFIX = 'vilo_saved_videos_v1';
export const DEFAULT_SAVED_LIST_ID = 'watch-later';
export const DEFAULT_SAVED_LIST_NAME = 'Guardados';

function getStorageKeyByUser(userId: string | null): string {
  return `${SAVED_STORAGE_PREFIX}:${userId || 'guest'}`;
}

function getStorageKey(): string {
  const userId = getAuthState().user?.id || null;
  return getStorageKeyByUser(userId);
}

function sanitizeLists(input: unknown): SavedVideoList[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is SavedVideoList => (
      typeof item?.id === 'string'
      && typeof item?.name === 'string'
      && Array.isArray(item?.videoIds)
      && typeof item?.createdAt === 'string'
      && typeof item?.updatedAt === 'string'
    ))
    .map((item) => ({
      ...item,
      videoIds: item.videoIds.filter((videoId) => typeof videoId === 'string' && videoId.length > 0),
    }));
}

function ensureDefaultList(lists: SavedVideoList[]): SavedVideoList[] {
  const hasDefault = lists.some((list) => list.id === DEFAULT_SAVED_LIST_ID);
  if (hasDefault) return lists;

  const now = new Date().toISOString();
  return [
    {
      id: DEFAULT_SAVED_LIST_ID,
      name: DEFAULT_SAVED_LIST_NAME,
      videoIds: [],
      createdAt: now,
      updatedAt: now,
    },
    ...lists,
  ];
}

function readLists(): SavedVideoList[] {
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (!raw) return ensureDefaultList([]);
    const parsed = JSON.parse(raw) as unknown;
    return ensureDefaultList(sanitizeLists(parsed));
  } catch {
    return ensureDefaultList([]);
  }
}

function writeLists(lists: SavedVideoList[]) {
  localStorage.setItem(getStorageKey(), JSON.stringify(ensureDefaultList(lists)));
}

export function getSavedLists(): SavedVideoList[] {
  return readLists()
    .slice()
    .sort((a, b) => {
      if (a.id === DEFAULT_SAVED_LIST_ID) return -1;
      if (b.id === DEFAULT_SAVED_LIST_ID) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
}

export function getSavedVideoIdsByList(listId: string): string[] {
  const list = readLists().find((item) => item.id === listId);
  return list ? [...list.videoIds] : [];
}

export function isVideoSavedInList(videoId: string, listId: string = DEFAULT_SAVED_LIST_ID): boolean {
  if (!videoId) return false;
  const list = readLists().find((item) => item.id === listId);
  return !!list?.videoIds.includes(videoId);
}

export function isVideoSavedAnywhere(videoId: string): boolean {
  if (!videoId) return false;
  return readLists().some((list) => list.videoIds.includes(videoId));
}

export function createSavedList(name: string): SavedVideoList | null {
  const trimmedName = name.trim();
  if (!trimmedName) return null;

  const lists = readLists();
  const existing = lists.find((list) => list.name.toLowerCase() === trimmedName.toLowerCase());
  if (existing) return existing;

  const now = new Date().toISOString();
  const created: SavedVideoList = {
    id: `list-${crypto.randomUUID()}`,
    name: trimmedName,
    videoIds: [],
    createdAt: now,
    updatedAt: now,
  };

  writeLists([...lists, created]);
  return created;
}

export function saveVideoToList(videoId: string, listId: string = DEFAULT_SAVED_LIST_ID): void {
  if (!videoId) return;
  const lists = readLists();
  const now = new Date().toISOString();

  const next = lists.map((list) => {
    if (list.id !== listId) return list;
    if (list.videoIds.includes(videoId)) {
      return { ...list, updatedAt: now };
    }
    return {
      ...list,
      videoIds: [videoId, ...list.videoIds],
      updatedAt: now,
    };
  });

  writeLists(next);
}

export function removeVideoFromList(videoId: string, listId: string = DEFAULT_SAVED_LIST_ID): void {
  if (!videoId) return;
  const now = new Date().toISOString();
  const next = readLists().map((list) => {
    if (list.id !== listId) return list;
    return {
      ...list,
      videoIds: list.videoIds.filter((id) => id !== videoId),
      updatedAt: now,
    };
  });
  writeLists(next);
}

export function toggleVideoInList(videoId: string, listId: string = DEFAULT_SAVED_LIST_ID): boolean {
  const exists = isVideoSavedInList(videoId, listId);
  if (exists) {
    removeVideoFromList(videoId, listId);
    return false;
  }
  saveVideoToList(videoId, listId);
  return true;
}

export function deleteSavedList(listId: string): void {
  if (!listId || listId === DEFAULT_SAVED_LIST_ID) return;
  const next = readLists().filter((list) => list.id !== listId);
  writeLists(next);
}

export function renameSavedList(listId: string, name: string): SavedVideoList | null {
  const trimmedName = name.trim();
  if (!listId || !trimmedName) return null;

  const lists = readLists();
  const target = lists.find((list) => list.id === listId);
  if (!target) return null;

  const hasDuplicate = lists.some((list) => (
    list.id !== listId
    && list.name.toLowerCase() === trimmedName.toLowerCase()
  ));
  if (hasDuplicate) return null;

  const now = new Date().toISOString();
  const next = lists.map((list) => (
    list.id === listId
      ? { ...list, name: trimmedName, updatedAt: now }
      : list
  ));

  writeLists(next);
  return next.find((list) => list.id === listId) || null;
}
