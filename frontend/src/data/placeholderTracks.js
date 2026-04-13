/**
 * placeholderTracks.js
 *
 * Fake track data that mirrors the exact shape of a real Spotify track object.
 * This means zero code changes are needed when we swap in real API data later —
 * the SongCard component will read the same fields (track.name, track.artists, etc.)
 */
export const PLACEHOLDER_TRACKS = [
  {
    id: 'placeholder-1',
    name: 'Blinding Lights',
    artists: [{ id: 'a1', name: 'The Weeknd' }],
    album: {
      name: 'After Hours',
      images: [
        {
          // A real, freely-available album art placeholder via picsum
          url: 'https://picsum.photos/seed/track1/500/500',
        },
      ],
    },
    preview_url: null, // No audio in checkpoint 1
    popularity:  92,
    duration_ms: 200040,
  },
  {
    id: 'placeholder-2',
    name: 'As It Was',
    artists: [{ id: 'a2', name: 'Harry Styles' }],
    album: {
      name: "Harry's House",
      images: [{ url: 'https://picsum.photos/seed/track2/500/500' }],
    },
    preview_url: null,
    popularity:  89,
    duration_ms: 167303,
  },
  {
    id: 'placeholder-3',
    name: 'Anti-Hero',
    artists: [{ id: 'a3', name: 'Taylor Swift' }],
    album: {
      name: 'Midnights',
      images: [{ url: 'https://picsum.photos/seed/track3/500/500' }],
    },
    preview_url: null,
    popularity:  95,
    duration_ms: 200690,
  },
  {
    id: 'placeholder-4',
    name: 'Flowers',
    artists: [{ id: 'a4', name: 'Miley Cyrus' }],
    album: {
      name: 'Endless Summer Vacation',
      images: [{ url: 'https://picsum.photos/seed/track4/500/500' }],
    },
    preview_url: null,
    popularity:  88,
    duration_ms: 200000,
  },
  {
    id: 'placeholder-5',
    name: 'Calm Down',
    artists: [{ id: 'a5', name: 'Rema' }, { id: 'a6', name: 'Selena Gomez' }],
    album: {
      name: 'Rave & Roses',
      images: [{ url: 'https://picsum.photos/seed/track5/500/500' }],
    },
    preview_url: null,
    popularity:  85,
    duration_ms: 239313,
  },
];