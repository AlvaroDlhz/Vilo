import { supabase } from './supabase';
import { getAuthState } from '../data/authStore';

export type NotificationType = 'comment' | 'reply' | 'subscription' | 'video';

export interface NotificationActorProfile {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
}

export interface AppNotification {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  entity_id: string | null;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
  metadata: Record<string, unknown> | null;
  actor_profile: NotificationActorProfile | null;
}

interface NotificationRow {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  entity_id: string | null;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
  metadata: Record<string, unknown> | null;
}

export interface CreateNotificationInput {
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

function mapRows(rows: NotificationRow[], profiles: NotificationActorProfile[]): AppNotification[] {
  const profileMap = new Map<string, NotificationActorProfile>();
  for (const p of profiles) profileMap.set(p.id, p);

  return rows.map((row) => ({
    ...row,
    actor_profile: row.actor_id ? (profileMap.get(row.actor_id) ?? null) : null,
  }));
}

async function attachActorProfiles(rows: NotificationRow[]): Promise<AppNotification[]> {
  if (rows.length === 0) return [];

  const actorIds = [...new Set(rows.map((n) => n.actor_id).filter((id): id is string => !!id))];
  if (actorIds.length === 0) {
    return rows.map((row) => ({ ...row, actor_profile: null }));
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, display_name, username, avatar_url')
    .in('id', actorIds);

  if (error || !profiles) return rows.map((row) => ({ ...row, actor_profile: null }));
  return mapRows(rows, profiles as NotificationActorProfile[]);
}

export async function fetchNotifications(limit = 20): Promise<AppNotification[]> {
  const { user } = getAuthState();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('id, recipient_id, actor_id, type, entity_id, title, message, created_at, read_at, metadata')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    if (error) console.error('[notifications] fetchNotifications error:', error);
    return [];
  }

  return attachActorProfiles(data as NotificationRow[]);
}

export async function markAllNotificationsRead(): Promise<boolean> {
  const { user } = getAuthState();
  if (!user) return false;

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', user.id)
    .is('read_at', null);

  if (error) {
    console.error('[notifications] markAllNotificationsRead error:', error);
    return false;
  }
  return true;
}

export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const { user } = getAuthState();
  if (!user) return false;

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('recipient_id', user.id)
    .is('read_at', null);

  if (error) {
    console.error('[notifications] markNotificationRead error:', error);
    return false;
  }
  return true;
}

export async function createNotification(input: CreateNotificationInput): Promise<boolean> {
  const { user } = getAuthState();
  if (!user) return false;
  if (input.recipientId === user.id) return true;

  const { error } = await supabase.from('notifications').insert({
    recipient_id: input.recipientId,
    actor_id: user.id,
    type: input.type,
    entity_id: input.entityId ?? null,
    title: input.title,
    message: input.message,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error('[notifications] createNotification error:', error);
    return false;
  }
  return true;
}

export async function notifySubscribersNewVideo(videoId: string, videoTitle: string): Promise<void> {
  const { user, profile } = getAuthState();
  if (!user) return;

  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('subscriber_id')
    .eq('channel_user_id', user.id);

  if (error || !subs || subs.length === 0) return;

  const actorName = profile?.display_name || profile?.username || 'Alguien';
  const rows = subs
    .map((sub) => sub.subscriber_id as string)
    .filter((recipientId) => recipientId && recipientId !== user.id)
    .map((recipientId) => ({
      recipient_id: recipientId,
      actor_id: user.id,
      type: 'video' as const,
      entity_id: videoId,
      title: 'Nuevo video',
      message: `${actorName} publico: ${videoTitle}`,
      metadata: { videoId },
    }));

  if (rows.length === 0) return;

  const { error: insertError } = await supabase.from('notifications').insert(rows);
  if (insertError) {
    console.error('[notifications] notifySubscribersNewVideo error:', insertError);
  }
}

function coerceRealtimeRecord(record: unknown): NotificationRow | null {
  if (!record || typeof record !== 'object') return null;
  const row = record as Partial<NotificationRow>;
  if (
    !row.id ||
    !row.recipient_id ||
    !row.type ||
    !row.title ||
    !row.message ||
    !row.created_at
  ) {
    return null;
  }

  return {
    id: row.id,
    recipient_id: row.recipient_id,
    actor_id: row.actor_id ?? null,
    type: row.type,
    entity_id: row.entity_id ?? null,
    title: row.title,
    message: row.message,
    created_at: row.created_at,
    read_at: row.read_at ?? null,
    metadata: row.metadata ?? null,
  };
}

export function subscribeToNotifications(
  userId: string,
  onEvent: (event: 'INSERT' | 'UPDATE', notification: AppNotification) => void,
): () => void {
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes' as never,
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${userId}`,
      } as never,
      async (payload: { eventType?: string; new?: unknown }) => {
        if (payload.eventType !== 'INSERT' && payload.eventType !== 'UPDATE') return;
        const row = coerceRealtimeRecord(payload.new);
        if (!row) return;
        const enriched = await attachActorProfiles([row]);
        const item = enriched[0];
        if (!item) return;
        onEvent(payload.eventType, item);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('Notification' in window)) return 'unsupported';
  return Notification.requestPermission();
}

export function showBrowserNotification(notification: AppNotification): void {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return;

  try {
    new Notification(notification.title, {
      body: notification.message,
      tag: notification.id,
    });
  } catch (err) {
    console.warn('[notifications] Browser notification failed:', err);
  }
}
