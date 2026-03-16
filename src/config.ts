import Constants from 'expo-constants';

const DEFAULT_PORT = '3000';

function extractHost(hostLike?: string | null): string | null {
  if (!hostLike) {
    return null;
  }

  const normalized = hostLike
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^exp:\/\//, '')
    .split('/')[0]
    .split(':')[0];

  return normalized || null;
}

function buildExpoApiUrl(): string | null {
  const constants = Constants as typeof Constants & {
    manifest?: { debuggerHost?: string | null };
    manifest2?: { extra?: { expoGo?: { debuggerHost?: string | null } } };
  };

  const host =
    extractHost(constants.expoConfig?.hostUri) ??
    extractHost(constants.manifest2?.extra?.expoGo?.debuggerHost) ??
    extractHost(constants.manifest?.debuggerHost);

  return host ? `http://${host}:${DEFAULT_PORT}` : null;
}

function isLocalhostUrl(url?: string | null): boolean {
  return !!url && /localhost|127\.0\.0\.1/i.test(url);
}

const envApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const expoApiUrl = buildExpoApiUrl();

// Physical devices cannot reach "localhost" on your computer, so prefer the Expo LAN host when available.
export const API_URL =
  envApiUrl && !isLocalhostUrl(envApiUrl)
    ? envApiUrl
    : expoApiUrl ?? envApiUrl ?? `http://localhost:${DEFAULT_PORT}`;
