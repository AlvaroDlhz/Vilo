import {
  getSession,
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
    const profile = await getProfile(userId);
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
  // Check existing session
  const { data } = await getSession();
  if (data.session) {
    const profile = await getProfile(data.session.user.id);
    setState({
      isLoggedIn: true,
      user: data.session.user,
      session: data.session,
      profile,
      isLoading: false,
    });
    await processPendingUploads(data.session.user.id);
  } else {
    setState({ isLoading: false });
  }

  // Listen for auth changes
  onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      const profile = await getProfile(session.user.id);
      setState({
        isLoggedIn: true,
        user: session.user,
        session,
        profile,
        isLoading: false,
      });
      await processPendingUploads(session.user.id);
    } else if (event === 'SIGNED_OUT') {
      setState({
        isLoggedIn: false,
        user: null,
        session: null,
        profile: null,
        isLoading: false,
      });
    } else if (event === 'TOKEN_REFRESHED' && session) {
      setState({ session });
    }
  });
}

export function savePendingAvatar(dataURL: string) {
  sessionStorage.setItem('pending_avatar', dataURL);
}

export function savePendingBanner(dataURL: string) {
  sessionStorage.setItem('pending_banner', dataURL);
}
