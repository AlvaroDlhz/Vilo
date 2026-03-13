import {
  getSession,
  setSession,
  getProfile,
  onAuthStateChange,
  uploadAvatar,
  uploadBanner,
  type User,
  type Session,
  type Profile,
} from '../lib/auth';

export interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
}

type Listener = (state: AuthState) => void;

const listeners = new Set<Listener>();

let state: AuthState = {
  isLoggedIn: false,
  user: null,
  session: null,
  profile: null,
  isLoading: true,
};

export interface SavedAccount {
  userId: string;
  email: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  accessToken: string;
  refreshToken: string;
  lastUsedAt: string;
}

const SAVED_ACCOUNTS_KEY = 'vilo_saved_accounts_v1';
const AUTH_TIMEOUT_MS = 15000;
const SESSION_SWITCH_WAIT_MS = 5000;
const SESSION_POLL_INTERVAL_MS = 150;
let switchingAccountTargetUserId: string | null = null;

function withTimeout<T>(promise: Promise<T>, timeoutMs = AUTH_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) => {
      setTimeout(() => reject(new Error('Auth request timed out')), timeoutMs);
    }),
  ]);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readSavedAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedAccount[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => (
      typeof item.userId === 'string'
      && typeof item.email === 'string'
      && typeof item.displayName === 'string'
      && typeof item.username === 'string'
      && typeof item.accessToken === 'string'
      && typeof item.refreshToken === 'string'
      && typeof item.lastUsedAt === 'string'
    ));
  } catch {
    return [];
  }
}

function writeSavedAccounts(accounts: SavedAccount[]) {
  localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts));
}

function removeSavedAccount(userId: string) {
  const next = readSavedAccounts().filter((item) => item.userId !== userId);
  writeSavedAccounts(next);
}

function buildSeedProfileFromSavedAccount(account: SavedAccount): Profile {
  const now = new Date().toISOString();
  return {
    id: account.userId,
    email: account.email,
    display_name: account.displayName || 'Usuario',
    username: account.username || '',
    birth_date: null,
    bio: '',
    interests: [],
    avatar_url: account.avatarUrl,
    banner_url: null,
    created_at: now,
    updated_at: now,
  };
}

function rememberAccount(session: Session, profile: Profile | null) {
  const accessToken = session.access_token;
  const refreshToken = session.refresh_token;
  if (!accessToken || !refreshToken) return;

  const next: SavedAccount = {
    userId: session.user.id,
    email: session.user.email || profile?.email || '',
    displayName: profile?.display_name || session.user.user_metadata?.display_name || session.user.email || 'Usuario',
    username: profile?.username || session.user.user_metadata?.username || '',
    avatarUrl: profile?.avatar_url || null,
    accessToken,
    refreshToken,
    lastUsedAt: new Date().toISOString(),
  };

  const saved = readSavedAccounts();
  const deduped = saved.filter((item) => item.userId !== next.userId);
  writeSavedAccounts([next, ...deduped].slice(0, 10));
}

async function safeGetProfile(userId: string): Promise<Profile | null> {
  try {
    return await withTimeout(getProfile(userId));
  } catch (err) {
    console.warn('[authStore] Failed to fetch profile:', err);
    return null;
  }
}

async function applySignedInSession(session: Session, seedProfile: Profile | null = null): Promise<void> {
  const previousProfile = state.profile?.id === session.user.id ? state.profile : null;
  const initialProfile = seedProfile ?? previousProfile;
  setState({
    isLoggedIn: true,
    user: session.user,
    session,
    profile: initialProfile,
    isLoading: false,
  });
  rememberAccount(session, initialProfile);

  void (async () => {
    const resolvedProfile = (await safeGetProfile(session.user.id)) ?? initialProfile;
    if (state.user?.id !== session.user.id) {
      return;
    }
    if (resolvedProfile) {
      setState({ profile: resolvedProfile, isLoading: false });
      rememberAccount(session, resolvedProfile);
    }

    try {
      await withTimeout(processPendingUploads(session.user.id));
    } catch (err) {
      console.warn('[authStore] Pending uploads took too long:', err);
    }
  })();
}

async function waitForSessionUser(userId: string, timeoutMs = SESSION_SWITCH_WAIT_MS): Promise<Session | null> {
  const start = Date.now();
  while ((Date.now() - start) < timeoutMs) {
    try {
      const { data } = await getSession();
      if (data.session?.user.id === userId) {
        return data.session;
      }
    } catch {
      // Keep trying until timeout.
    }
    await sleep(SESSION_POLL_INTERVAL_MS);
  }
  return null;
}

async function restorePreviousSession(previousSession: Session | null): Promise<void> {
  if (!previousSession?.access_token || !previousSession.refresh_token) {
    setState({ isLoading: false });
    return;
  }

  try {
    const { data, error } = await withTimeout(setSession(previousSession.access_token, previousSession.refresh_token));
    if (error) {
      setState({ isLoading: false });
      return;
    }

    const restored = data.session
      ?? (await getSession()).data.session
      ?? await waitForSessionUser(previousSession.user.id);

    if (restored) {
      await applySignedInSession(restored);
      return;
    }
  } catch (err) {
    console.warn('[authStore] restorePreviousSession failed:', err);
  }

  setState({ isLoading: false });
}

function setState(partial: Partial<AuthState>) {
  state = { ...state, ...partial };
  listeners.forEach((fn) => fn(state));
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAuthState(): AuthState {
  return state;
}

export function getSavedAccounts(): SavedAccount[] {
  return readSavedAccounts()
    .sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime());
}

export async function switchToSavedAccount(userId: string): Promise<boolean> {
  const account = readSavedAccounts().find((item) => item.userId === userId);
  if (!account) return false;
  if (state.user?.id === userId) return true;

  const previousSession = state.session;
  const seedProfile = buildSeedProfileFromSavedAccount(account);
  setState({ isLoading: true });
  switchingAccountTargetUserId = userId;
  try {
    const { data, error } = await withTimeout(setSession(account.accessToken, account.refreshToken));
    if (error) {
      removeSavedAccount(userId);
      const delayedSession = await waitForSessionUser(userId);
      if (delayedSession) {
        await applySignedInSession(delayedSession, seedProfile);
        return true;
      }
      await restorePreviousSession(previousSession);
      return false;
    }

    const switchedSession = data.session
      ?? (await getSession()).data.session
      ?? await waitForSessionUser(userId);
    if (!switchedSession || switchedSession.user.id !== userId) {
      const delayedSession = await waitForSessionUser(userId);
      if (delayedSession) {
        await applySignedInSession(delayedSession, seedProfile);
        return true;
      }
      await restorePreviousSession(previousSession);
      return false;
    }

    await applySignedInSession(switchedSession, seedProfile);
    return true;
  } catch (err) {
    console.warn('[authStore] switchToSavedAccount failed:', err);
    try {
      const fallbackSession = await waitForSessionUser(userId);
      if (fallbackSession) {
        await applySignedInSession(fallbackSession, seedProfile);
        return true;
      }
    } catch (fallbackErr) {
      console.warn('[authStore] switchToSavedAccount fallback failed:', fallbackErr);
    }
    await restorePreviousSession(previousSession);
    return false;
  } finally {
    switchingAccountTargetUserId = null;
  }
}

async function processPendingUploads(userId: string) {
  const pendingAvatar = sessionStorage.getItem('pending_avatar');
  const pendingBanner = sessionStorage.getItem('pending_banner');

  if (pendingAvatar) {
    try {
      const blob = dataURLtoBlob(pendingAvatar);
      await uploadAvatar(userId, blob);
      sessionStorage.removeItem('pending_avatar');
    } catch (err) {
      console.warn('[authStore] Failed to upload pending avatar:', err);
    }
  }

  if (pendingBanner) {
    try {
      const blob = dataURLtoBlob(pendingBanner);
      await uploadBanner(userId, blob);
      sessionStorage.removeItem('pending_banner');
    } catch (err) {
      console.warn('[authStore] Failed to upload pending banner:', err);
    }
  }

  if (pendingAvatar || pendingBanner) {
    const profile = await safeGetProfile(userId);
    if (profile) setState({ profile });
  }
}

function dataURLtoBlob(dataURL: string): Blob {
  const parts = dataURL.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/webp';
  const binary = atob(parts[1]);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

export async function initAuthStore(): Promise<void> {
  try {
    // Check existing session
    const { data } = await withTimeout(getSession());
    if (data.session) {
      await applySignedInSession(data.session);
    } else {
      setState({ isLoading: false });
    }
  } catch (err) {
    console.warn('[authStore] initAuthStore failed:', err);
    setState({ isLoading: false });
  }

  // Listen for auth changes
  onAuthStateChange(async (event, session) => {
    try {
      if (event === 'SIGNED_IN' && session) {
        await applySignedInSession(session);
      } else if (event === 'SIGNED_OUT') {
        if (switchingAccountTargetUserId) {
          return;
        }
        const { data: latest } = await withTimeout(getSession(), 3000);
        if (latest.session) {
          await applySignedInSession(latest.session);
          return;
        }
        if (state.isLoggedIn && state.session) {
          await sleep(250);
          const { data: retry } = await withTimeout(getSession(), 3000);
          if (retry.session) {
            await applySignedInSession(retry.session);
            return;
          }
        }
        setState({
          isLoggedIn: false,
          user: null,
          session: null,
          profile: null,
          isLoading: false,
        });
      } else if (event === 'TOKEN_REFRESHED' && session) {
        if (state.user?.id !== session.user.id) {
          await applySignedInSession(session);
          return;
        }

        setState({
          session,
          user: session.user,
          isLoading: false,
        });
        const knownProfile = state.profile?.id === session.user.id ? state.profile : null;
        rememberAccount(session, knownProfile);
      }
    } catch (err) {
      console.warn('[authStore] onAuthStateChange failed:', err);
      setState({
        isLoggedIn: !!session,
        user: session?.user || state.user,
        session: session || state.session,
        profile: state.profile,
        isLoading: false,
      });
    }
  });
}

export function savePendingAvatar(dataURL: string) {
  sessionStorage.setItem('pending_avatar', dataURL);
}

export function savePendingBanner(dataURL: string) {
  sessionStorage.setItem('pending_banner', dataURL);
}
