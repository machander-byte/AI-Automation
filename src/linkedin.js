import crypto from 'node:crypto';
import fs from 'node:fs';
import config from './config.js';

const AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const API_BASE = 'https://api.linkedin.com/v2';

const SCOPES = ['r_liteprofile', 'r_emailaddress', 'w_member_social'];

const jsonHeaders = {
  'Content-Type': 'application/json',
};

function requireConfig() {
  if (!config.linkedinClientId || !config.linkedinClientSecret || !config.linkedinRedirectUri) {
    throw new Error('LinkedIn OAuth is not configured. Set LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, and LINKEDIN_REDIRECT_URI.');
  }
}

function createStateToken() {
  return crypto.randomBytes(16).toString('hex');
}

function buildAuthUrl(state) {
  requireConfig();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.linkedinClientId,
    redirect_uri: config.linkedinRedirectUri,
    scope: SCOPES.join(' '),
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

async function exchangeCodeForToken(code) {
  requireConfig();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.linkedinRedirectUri,
    client_id: config.linkedinClientId,
    client_secret: config.linkedinClientSecret,
  });
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LinkedIn token exchange failed (${response.status}): ${text}`);
  }
  const payload = await response.json();
  return {
    accessToken: payload.access_token,
    expiresIn: payload.expires_in,
  };
}

async function fetchProfile(accessToken) {
  const response = await fetch(`${API_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Failed to fetch LinkedIn profile (${response.status})`);
    error.status = response.status;
    error.details = text;
    throw error;
  }
  return response.json();
}

async function registerImageUpload(accessToken, owner) {
  const response = await fetch(`${API_BASE}/assets?action=registerUpload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...jsonHeaders,
    },
    body: JSON.stringify({
      registerUploadRequest: {
        owner,
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        serviceRelationships: [
          { relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' },
        ],
        supportedUploadMechanism: ['SYNCHRONOUS_UPLOAD'],
      },
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Failed to register upload (${response.status})`);
    error.status = response.status;
    error.details = text;
    throw error;
  }
  const payload = await response.json();
  const uploadMechanism = payload?.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'];
  const uploadUrl = uploadMechanism?.uploadUrl;
  const asset = payload?.value?.asset;
  if (!uploadUrl || !asset) {
    throw new Error('Missing upload URL or asset id from LinkedIn response.');
  }
  return { uploadUrl, asset };
}

async function uploadBinary(uploadUrl, filePath) {
  const buffer = fs.readFileSync(filePath);
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': buffer.length.toString(),
    },
    body: buffer,
  });
  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Failed to upload image (${response.status})`);
    error.status = response.status;
    error.details = text;
    throw error;
  }
}

async function createImageShare(accessToken, owner, asset, text) {
  const response = await fetch(`${API_BASE}/ugcPosts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...jsonHeaders,
    },
    body: JSON.stringify({
      author: owner,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: 'IMAGE',
          media: [
            {
              status: 'READY',
              description: { text },
              media: asset,
              title: { text },
            },
          ],
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'CONNECTIONS',
      },
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Failed to create share (${response.status})`);
    error.status = response.status;
    error.details = text;
    throw error;
  }
  return response.json();
}

async function sharePosterToFeed({ accessToken, owner, filePath, text }) {
  if (!accessToken || !owner) {
    throw new Error('Missing LinkedIn credentials.');
  }
  const { uploadUrl, asset } = await registerImageUpload(accessToken, owner);
  await uploadBinary(uploadUrl, filePath);
  const response = await createImageShare(accessToken, owner, asset, text);
  return {
    asset,
    share: response,
  };
}

export {
  SCOPES,
  createStateToken,
  buildAuthUrl,
  exchangeCodeForToken,
  fetchProfile,
  sharePosterToFeed,
};
