import { supabase } from './supabase';
import { getAuthState } from '../data/authStore';

export async function voteVideo(videoId: string, vote: 1 | -1): Promise<boolean> {
  const { user } = getAuthState();
  if (!user) return false;

  const { data: existing } = await supabase
    .from('video_votes')
    .select('vote')
    .eq('video_id', videoId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    if (existing.vote === vote) {
      // Same vote — remove it (toggle off)
      const { error } = await supabase
        .from('video_votes')
        .delete()
        .eq('video_id', videoId)
        .eq('user_id', user.id);
      return !error;
    } else {
      // Different vote — update
      const { error } = await supabase
        .from('video_votes')
        .update({ vote })
        .eq('video_id', videoId)
        .eq('user_id', user.id);
      return !error;
    }
  } else {
    // No existing vote — insert
    const { error } = await supabase
      .from('video_votes')
      .insert({ video_id: videoId, user_id: user.id, vote });
    return !error;
  }
}

export async function getUserVideoVote(videoId: string): Promise<number | null> {
  const { user } = getAuthState();
  if (!user) return null;

  const { data } = await supabase
    .from('video_votes')
    .select('vote')
    .eq('video_id', videoId)
    .eq('user_id', user.id)
    .maybeSingle();

  return data?.vote ?? null;
}

export async function incrementViews(videoId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_video_views', { p_video_id: videoId });
  if (error) console.error('[videoInteractions] incrementViews error:', error);
}

export async function getVideoStats(videoId: string): Promise<{ likes: number; dislikes: number; viewCount: number }> {
  const { data, error } = await supabase
    .from('user_videos')
    .select('likes, dislikes, view_count')
    .eq('id', videoId)
    .single();

  if (error || !data) {
    console.error('[videoInteractions] getVideoStats error:', error);
    return { likes: 0, dislikes: 0, viewCount: 0 };
  }

  return {
    likes: data.likes ?? 0,
    dislikes: data.dislikes ?? 0,
    viewCount: data.view_count ?? 0,
  };
}
