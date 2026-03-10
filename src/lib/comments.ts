import { supabase } from './supabase';
import { getAuthState } from '../data/authStore';

export interface Comment {
  id: string;
  video_id: string;
  user_id: string;
  parent_id: string | null;
  text: string;
  likes: number;
  dislikes: number;
  created_at: string;
  reply_count: number;
  profile: {
    display_name: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

async function attachProfiles(rows: any[]): Promise<Comment[]> {
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map(r => r.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, username, avatar_url')
    .in('id', userIds);

  const profileMap = new Map<string, { display_name: string; username: string; avatar_url: string | null }>();
  if (profiles) {
    for (const p of profiles) {
      profileMap.set(p.id, { display_name: p.display_name, username: p.username, avatar_url: p.avatar_url });
    }
  }

  return rows.map(r => ({
    ...r,
    profile: profileMap.get(r.user_id) || null,
  })) as Comment[];
}

export async function fetchComments(videoId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('video_id', videoId)
    .is('parent_id', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[comments] fetchComments error:', error);
    return [];
  }

  // Count replies per top-level comment
  const topIds = (data || []).map(c => c.id);
  let replyCounts = new Map<string, number>();
  if (topIds.length > 0) {
    const { data: replies } = await supabase
      .from('comments')
      .select('parent_id')
      .in('parent_id', topIds);
    if (replies) {
      for (const r of replies) {
        replyCounts.set(r.parent_id, (replyCounts.get(r.parent_id) || 0) + 1);
      }
    }
  }

  const comments = await attachProfiles(data || []);
  for (const c of comments) {
    c.reply_count = replyCounts.get(c.id) || 0;
  }
  return comments;
}

export async function fetchReplies(commentId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('parent_id', commentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[comments] fetchReplies error:', error);
    return [];
  }

  const replies = await attachProfiles(data || []);
  for (const r of replies) {
    r.reply_count = 0;
  }
  return replies;
}

export async function postComment(videoId: string, text: string, parentId?: string): Promise<Comment | null> {
  const { user } = getAuthState();
  if (!user) return null;

  const row: Record<string, unknown> = { video_id: videoId, user_id: user.id, text };
  if (parentId) row.parent_id = parentId;

  const { data, error } = await supabase
    .from('comments')
    .insert(row)
    .select('*')
    .single();

  if (error) {
    console.error('[comments] postComment error:', error);
    return null;
  }
  if (!data) return null;

  const results = await attachProfiles([data]);
  return results[0] || null;
}

export async function voteComment(commentId: string, vote: 1 | -1): Promise<boolean> {
  const { user } = getAuthState();
  if (!user) return false;

  // Check existing vote
  const { data: existing } = await supabase
    .from('comment_votes')
    .select('vote')
    .eq('comment_id', commentId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    if (existing.vote === vote) {
      // Same vote — remove it
      const { error } = await supabase
        .from('comment_votes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);
      return !error;
    } else {
      // Different vote — update
      const { error } = await supabase
        .from('comment_votes')
        .update({ vote })
        .eq('comment_id', commentId)
        .eq('user_id', user.id);
      return !error;
    }
  } else {
    // No existing vote — insert
    const { error } = await supabase
      .from('comment_votes')
      .insert({ comment_id: commentId, user_id: user.id, vote });
    return !error;
  }
}

export async function deleteComment(commentId: string): Promise<boolean> {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);
  return !error;
}

export async function getUserVotes(): Promise<Map<string, number>> {
  const { user } = getAuthState();
  if (!user) return new Map();

  const { data } = await supabase
    .from('comment_votes')
    .select('comment_id, vote')
    .eq('user_id', user.id);

  const map = new Map<string, number>();
  if (data) {
    for (const row of data) {
      map.set(row.comment_id, row.vote);
    }
  }
  return map;
}

export async function fetchCommentsWithVotes(videoId: string): Promise<{ comments: Comment[]; userVotes: Map<string, number> }> {
  const [comments, userVotes] = await Promise.all([
    fetchComments(videoId),
    getUserVotes(),
  ]);
  return { comments, userVotes };
}
