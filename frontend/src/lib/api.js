import { PLACEHOLDER_TRACKS } from '../data/placeholderTracks';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const STORAGE_KEYS = {
  liked: 'spotifytinder-liked',
  passed: 'spotifytinder-passed',
};

const toArtistObject = (artist) => ({ name: artist });

const normalizeTrack = (track, index = 0) => {
  if (!track) {
    return null;
  }

  if (track.id && track.name && Array.isArray(track.artists)) {
    return track;
  }

  const artistNames = Array.isArray(track.artists)
    ? track.artists.map((artist) => artist.name).filter(Boolean)
    : String(track.artist || '')
      .split(',')
      .map((artist) => artist.trim())
      .filter(Boolean);

  const imageUrl = track.imageUrl || track.album?.images?.[0]?.url || '';

  return {
    id: track.spotifyId || track.id || `local-track-${index}`,
    spotifyId: track.spotifyId || track.id || `local-track-${index}`,
    name: track.title || track.name || 'Untitled Track',
    artists: artistNames.length ? artistNames.map(toArtistObject) : [{ name: 'Unknown artist' }],
    album: {
      name: track.album?.name || track.album || 'Unknown release',
      images: imageUrl ? [{ url: imageUrl }] : [],
    },
    preview_url: track.previewUrl || track.preview_url || '',
    popularity: track.popularity,
  };
};

const serializeTrack = (track) => ({
  spotifyId: track.spotifyId || track.id,
  title: track.name,
  artist: track.artists?.map((artist) => artist.name).join(', ') || '',
  album: track.album?.name || '',
  imageUrl: track.album?.images?.[0]?.url || '',
  previewUrl: track.preview_url || '',
  popularity: track.popularity,
});

const readStorage = (key) => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeStorage = (key, value) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};

const upsertStoredTrack = (key, track) => {
  const serialized = serializeTrack(track);
  const existing = readStorage(key).filter((item) => item.spotifyId !== serialized.spotifyId);
  writeStorage(key, [serialized, ...existing]);
};

const getStoredTrackIds = () => {
  const liked = readStorage(STORAGE_KEYS.liked).map((track) => track.spotifyId);
  const passed = readStorage(STORAGE_KEYS.passed).map((track) => track.spotifyId);
  return new Set([...liked, ...passed].filter(Boolean));
};

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json();
  }

  return response.text();
};

const buildFallbackTracks = ({ query, excludedIds = [] }) => {
  const lowerQuery = (query || '').toLowerCase();
  const storedIds = getStoredTrackIds();
  const excluded = new Set([...excludedIds, ...storedIds]);
  const normalized = PLACEHOLDER_TRACKS.map(normalizeTrack);

  const matchingTracks = normalized.filter((track) => {
    const haystack = [
      track.name,
      track.album?.name,
      ...(track.artists || []).map((artist) => artist.name),
    ]
      .join(' ')
      .toLowerCase();

    return !excluded.has(track.id) && (!lowerQuery || haystack.includes(lowerQuery));
  });

  return (matchingTracks.length ? matchingTracks : normalized.filter((track) => !excluded.has(track.id)))
    .slice(0, 10);
};

export const fetchSongs = async ({ uid, query, excludedIds = [] }) => {
  try {
    const songs = await request(`/songs?q=${encodeURIComponent(query)}&uid=${encodeURIComponent(uid)}`);
    const tracks = songs.map(normalizeTrack).filter((track) => !excludedIds.includes(track.id));
    return { tracks, mode: 'backend' };
  } catch {
    return {
      tracks: buildFallbackTracks({ query, excludedIds }),
      mode: 'offline',
    };
  }
};

export const fetchLikedSongs = async (uid) => {
  try {
    const songs = await request(`/likedSongs/${encodeURIComponent(uid)}`);
    const tracks = songs.map(normalizeTrack);
    writeStorage(STORAGE_KEYS.liked, tracks.map(serializeTrack));
    return { tracks, mode: 'backend' };
  } catch {
    return {
      tracks: readStorage(STORAGE_KEYS.liked).map(normalizeTrack),
      mode: 'offline',
    };
  }
};

export const saveLikedSong = async (uid, track) => {
  upsertStoredTrack(STORAGE_KEYS.liked, track);

  return request('/like', {
    method: 'POST',
    body: JSON.stringify({
      uid,
      song: serializeTrack(track),
    }),
  });
};

export const savePassedSong = async (uid, track) => {
  upsertStoredTrack(STORAGE_KEYS.passed, track);

  return request('/pass', {
    method: 'POST',
    body: JSON.stringify({
      uid,
      song: serializeTrack(track),
    }),
  });
};
