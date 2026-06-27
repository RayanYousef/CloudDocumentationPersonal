/**
 * GitHub Device Authorization Flow helpers.
 * https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow
 *
 * No server required — client_id is public. The user approves on github.com/login/device.
 * Requires the GitHub OAuth App to have "Device Flow" enabled in its settings.
 */

const DEVICE_CODE_URL = 'https://github.com/login/device/code';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';

/**
 * Step 1: request a device + user code from GitHub.
 * Returns { device_code, user_code, verification_uri, interval, expires_in }.
 */
export async function startDeviceFlow(clientId) {
  const resp = await fetch(DEVICE_CODE_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Accept: 'application/json'},
    body: JSON.stringify({client_id: clientId, scope: 'repo'}),
  });
  if (!resp.ok) {
    throw new Error(`GitHub returned ${resp.status} starting device flow.`);
  }
  const data = await resp.json();
  if (data.error) throw new Error(data.error_description || data.error);
  return data;
}

/**
 * Step 2: poll until the user approves (or the code expires).
 * Resolves with the access token string, or rejects with a user-facing Error.
 *
 * @param {string} clientId
 * @param {string} deviceCode
 * @param {number} interval  seconds between polls (from step 1 response)
 * @param {AbortSignal} [signal]
 */
export async function pollForToken(clientId, deviceCode, interval, signal) {
  const delay = (ms) =>
    new Promise((res, rej) => {
      const t = setTimeout(res, ms);
      signal?.addEventListener('abort', () => {
        clearTimeout(t);
        rej(new Error('Cancelled'));
      });
    });

  let pollMs = (interval || 5) * 1000;
  const deadline = Date.now() + 15 * 60 * 1000; // 15 min hard cap

  while (Date.now() < deadline) {
    await delay(pollMs);
    if (signal?.aborted) throw new Error('Cancelled');

    const resp = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Accept: 'application/json'},
      body: JSON.stringify({
        client_id: clientId,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    if (!resp.ok) throw new Error(`GitHub returned ${resp.status} while polling.`);
    const data = await resp.json();

    if (data.access_token) return data.access_token;

    switch (data.error) {
      case 'authorization_pending':
        break; // keep polling
      case 'slow_down':
        pollMs += 5000; // GitHub asked us to back off
        break;
      case 'expired_token':
        throw new Error('The code expired. Please try again.');
      case 'access_denied':
        throw new Error('Authorization was denied on GitHub.');
      default:
        throw new Error(data.error_description || data.error || 'Unknown polling error.');
    }
  }
  throw new Error('Timed out waiting for GitHub authorization.');
}
