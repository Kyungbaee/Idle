const express = require('express');
const axios = require('axios');
const randomstring = require('randomstring');

const router = express.Router();

const STATE_COOKIE_NAME = 'github_oauth_state';
const TOKEN_COOKIE_NAME = 'github_token';
const STATE_TTL = 5 * 60 * 1000; // 5 minutes
const pendingStates = new Map();

function pruneStates() {
  const now = Date.now();
  for (const [state, createdAt] of pendingStates) {
    if (now - createdAt > STATE_TTL) {
      pendingStates.delete(state);
    }
  }
}

router.get('/login', (req, res) => {
  const { GITHUB_CLIENT_ID, GITHUB_REDIRECT_URI } = process.env;

  if (!GITHUB_CLIENT_ID || !GITHUB_REDIRECT_URI) {
    return res
      .status(500)
      .json({ error: 'GitHub OAuth is not configured properly.' });
  }

  pruneStates();

  const state = randomstring.generate(32);
  pendingStates.set(state, Date.now());

  res.cookie(STATE_COOKIE_NAME, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: STATE_TTL,
  });

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_REDIRECT_URI,
    scope: 'read:user user:email',
    state,
    allow_signup: 'true',
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  const storedState = req.cookies ? req.cookies[STATE_COOKIE_NAME] : undefined;

  pruneStates();

  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state parameter.' });
  }

  if (!storedState || storedState !== state || !pendingStates.has(state)) {
    return res.status(400).json({ error: 'Invalid OAuth state.' });
  }

  pendingStates.delete(state);
  res.clearCookie(STATE_COOKIE_NAME);

  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_REDIRECT_URI } =
    process.env;

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !GITHUB_REDIRECT_URI) {
    return res
      .status(500)
      .json({ error: 'GitHub OAuth is not configured properly.' });
  }

  try {
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: GITHUB_REDIRECT_URI,
        state,
      },
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    const accessToken = tokenResponse.data && tokenResponse.data.access_token;

    if (!accessToken) {
      return res
        .status(500)
        .json({ error: 'Failed to retrieve access token from GitHub.' });
    }

    res.cookie(TOKEN_COOKIE_NAME, accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return res.json({ success: true });
  } catch (error) {
    const status = error.response ? error.response.status : 500;
    const message =
      (error.response && error.response.data) ||
      error.message ||
      'Failed to exchange authorization code.';

    console.error('GitHub OAuth callback error:', message);

    return res.status(status).json({ error: 'Failed to exchange authorization code.' });
  }
});

router.get('/me', async (req, res) => {
  const token = req.cookies ? req.cookies[TOKEN_COOKIE_NAME] : undefined;

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  try {
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Idle-App',
      },
    });

    return res.json(userResponse.data);
  } catch (error) {
    const status = error.response ? error.response.status : 500;

    if (status === 401) {
      res.clearCookie(TOKEN_COOKIE_NAME);
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    console.error('GitHub user fetch error:', error.message || error);
    return res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

module.exports = router;
