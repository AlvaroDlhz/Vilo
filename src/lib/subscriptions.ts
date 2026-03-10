import { supabase } from './supabase';
import { getAuthState } from '../data/authStore';

export async function toggleSubscription(channelUserId: string): Promise<boolean> {
  const { user } = getAuthState();
  if (!user) { console.warn('[subscriptions] No user logged in'); return false; }

  const { data: existing, error: selectError } = await supabase
    .from('subscriptions')
    .select('subscriber_id')
    .eq('subscriber_id', user.id)
    .eq('channel_user_id', channelUserId)
    .maybeSingle();

  if (selectError) {
    console.error('[subscriptions] Error checking subscription:', selectError);
    return false;
  }

  if (existing) {
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('subscriber_id', user.id)
      .eq('channel_user_id', channelUserId);
    if (error) console.error('[subscriptions] Error deleting:', error);
    return !error;
  } else {
    const { error } = await supabase
      .from('subscriptions')
      .insert({ subscriber_id: user.id, channel_user_id: channelUserId });
    if (error) console.error('[subscriptions] Error inserting:', error);
    return !error;
  }
}

export async function isSubscribed(channelUserId: string): Promise<boolean> {
  const { user } = getAuthState();
  if (!user) return false;

  const { data } = await supabase
    .from('subscriptions')
    .select('subscriber_id')
    .eq('subscriber_id', user.id)
    .eq('channel_user_id', channelUserId)
    .maybeSingle();

  return !!data;
}

export interface SubscribedChannel {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

export async function getUserSubscriptions(): Promise<SubscribedChannel[]> {
  const { user } = getAuthState();
  if (!user) return [];

  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('channel_user_id')
    .eq('subscriber_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !subs || subs.length === 0) {
    if (error) console.error('[subscriptions] Error fetching subscriptions:', error);
    return [];
  }

  const channelIds = subs.map(s => s.channel_user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, username, avatar_url')
    .in('id', channelIds);

  const profileMap = new Map<string, any>();
  if (profiles) {
    for (const p of profiles) profileMap.set(p.id, p);
  }

  return channelIds.map(id => {
    const p = profileMap.get(id);
    return {
      userId: id,
      displayName: p?.display_name || p?.username || 'Usuario',
      username: p?.username || '',
      avatarUrl: p?.avatar_url || null,
    };
  });
}

export async function getSubscriberCount(channelUserId: string): Promise<number> {
  const { data } = await supabase
    .from('profiles')
    .select('subscriber_count')
    .eq('id', channelUserId)
    .single();

  return data?.subscriber_count ?? 0;
}
