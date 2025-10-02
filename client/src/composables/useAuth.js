import { computed, ref } from 'vue';
import { AUTH_STORAGE_KEY, CONFIG } from '@/config';

function sanitizeUser(user) {
  if (!user || typeof user !== 'object') return null;
  const login = user.login || user.username || '';
  const name = user.name || user.displayName || '';
  const avatar = user.avatar_url || user.avatarUrl || '';
  const id = user.id ?? null;
  return {
    id,
    login,
    name,
    avatar_url: avatar,
    html_url: user.html_url || user.url || null,
  };
}

function sanitizeSession(session) {
  if (!session || typeof session !== 'object') return null;
  const safeUser = sanitizeUser(session.user);
  if (!safeUser) return null;
  return {
    user: safeUser,
    demo: Boolean(session.demo),
    provider: session.provider ?? 'github',
    lastLoginAt: Date.now(),
  };
}

function loadAuthState() {
  if (typeof window === 'undefined') return null;
  try {
    const saved = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!saved) return null;
    return sanitizeSession(JSON.parse(saved));
  } catch (error) {
    console.error('Failed to load auth session', error);
    return null;
  }
}

function persistAuthState(session) {
  if (typeof window === 'undefined') return;
  if (!session) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

async function fetchGitHubUser(token) {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!response.ok) {
    throw new Error('GitHub 사용자 정보를 불러오지 못했어요.');
  }
  return response.json();
}

async function exchangeCodeForSession(code) {
  if (!CONFIG.authProxyUrl) {
    throw new Error('OAuth 프록시 URL이 설정되지 않았어요.');
  }
  const response = await fetch(CONFIG.authProxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      code,
      redirectUri: `${window.location.origin}${window.location.pathname}`,
    }),
  });
  if (!response.ok) {
    throw new Error('로그인 과정에서 오류가 발생했어요.');
  }
  const payload = await response.json();
  if (payload.user) {
    return { user: payload.user, provider: payload.provider ?? 'github' };
  }
  if (payload.access_token) {
    const user = await fetchGitHubUser(payload.access_token);
    return { user, provider: 'github' };
  }
  throw new Error('응답에 사용자 정보가 포함되어 있지 않아요.');
}

function clearOAuthParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  window.history.replaceState({}, document.title, url.toString());
}

export function useAuth() {
  const session = ref(loadAuthState());
  const loading = ref(false);
  const error = ref('');

  function setSession(next) {
    const sanitized = sanitizeSession(next);
    session.value = sanitized;
    persistAuthState(sanitized);
  }

  async function handleOAuthRedirect() {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    if (!code) return;
    loading.value = true;
    error.value = '';
    try {
      const result = await exchangeCodeForSession(code);
      setSession({ ...result, demo: false });
      clearOAuthParams();
    } catch (err) {
      console.error(err);
      error.value = err instanceof Error ? err.message : '로그인에 실패했어요.';
      setSession(null);
    } finally {
      loading.value = false;
    }
  }

  function loginWithGitHub() {
    error.value = '';
    if (!CONFIG.githubClientId) {
      error.value = '깃허브 OAuth Client ID를 설정해주세요.';
      return;
    }
    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    const oauthUrl = new URL('https://github.com/login/oauth/authorize');
    oauthUrl.searchParams.set('client_id', CONFIG.githubClientId);
    oauthUrl.searchParams.set('scope', 'read:user user:email');
    oauthUrl.searchParams.set('redirect_uri', redirectUri);
    oauthUrl.searchParams.set('allow_signup', 'true');
    window.location.href = oauthUrl.toString();
  }

  function loginDemo() {
    if (!CONFIG.enableDemoLogin) {
      error.value = '데모 로그인이 비활성화되어 있어요.';
      return;
    }
    setSession({ user: CONFIG.demoUser, provider: 'demo', demo: true });
  }

  function logout() {
    setSession(null);
  }

  const isAuthenticated = computed(() => Boolean(session.value));

  return {
    session,
    loading,
    error,
    isAuthenticated,
    loginWithGitHub,
    loginDemo,
    logout,
    handleOAuthRedirect,
    enableDemoLogin: CONFIG.enableDemoLogin,
  };
}
