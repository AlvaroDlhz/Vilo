import { supabase } from './supabase';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

export interface SignUpData {
  email: string;
  password: string;
  display_name: string;
  username: string;
  birth_date: string;
  bio: string;
  interests: string[];
}

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  username: string;
  birth_date: string | null;
  bio: string;
  interests: string[];
  avatar_url: string | null;
  banner_url: string | null;
  created_at: string;
  updated_at: string;
}

function resolveEmailRedirectUrl(): string | undefined {
  const env = import.meta.env as Record<string, string | undefined>;
  const configured =
    env.VITE_EMAIL_REDIRECT_TO
    || env.VITE_PUBLIC_APP_URL
    || env.VITE_APP_URL;

  if (configured && configured.trim().length > 0) {
    return configured.trim();
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return undefined;
}

export async function signUp(data: SignUpData) {
  const emailRedirectTo = resolveEmailRedirectUrl();

  return supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      ...(emailRedirectTo ? { emailRedirectTo } : {}),
      data: {
        display_name: data.display_name,
        username: data.username,
        birth_date: data.birth_date,
        bio: data.bio,
        interests: data.interests,
      },
    },
  });
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  // Local scope is more resilient for SPA logout UX (clears current session immediately).
  return supabase.auth.signOut({ scope: 'local' });
}

export async function getSession() {
  return supabase.auth.getSession();
}

export async function setSession(accessToken: string, refreshToken: string) {
  return supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
}

export async function getUserFromAccessToken(accessToken: string) {
  return supabase.auth.getUser(accessToken);
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return data as Profile;
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  return supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);
}

export async function uploadAvatar(userId: string, file: File | Blob) {
  const ext = file instanceof File ? file.name.split('.').pop() : 'webp';
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true });
  if (uploadError) return { error: uploadError, url: null };

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = `${data.publicUrl}?t=${Date.now()}`;

  await updateProfile(userId, { avatar_url: url });
  return { error: null, url };
}

export async function uploadBanner(userId: string, file: File | Blob) {
  const ext = file instanceof File ? file.name.split('.').pop() : 'webp';
  const path = `${userId}/banner.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('banners')
    .upload(path, file, { upsert: true });
  if (uploadError) return { error: uploadError, url: null };

  const { data } = supabase.storage.from('banners').getPublicUrl(path);
  const url = `${data.publicUrl}?t=${Date.now()}`;

  await updateProfile(userId, { banner_url: url });
  return { error: null, url };
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  if (error) return false;
  return data === null;
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  const { data } = supabase.auth.onAuthStateChange(callback);
  return data.subscription.unsubscribe;
}

export type { User, Session };
