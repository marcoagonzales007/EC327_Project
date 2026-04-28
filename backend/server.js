require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const db = require("./firebase");
const spotifyPreviewFinder = require("spotify-preview-finder");

const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://spotifyproject-zzekf81e5-koulourismarios-projects.vercel.app',
    'https://ec-327-project.vercel.app/'
  ]
}));
app.use(express.json());

const DEFAULT_DISCOVERY_QUERIES = [
  "genre:pop",
  "genre:indie",
  "genre:hip-hop",
  "genre:r-n-b",
  "genre:alternative",
];

const STOP_WORDS = new Set([
  "the",
  "and",
  "feat",
  "with",
  "from",
  "your",
  "this",
  "that",
  "radio",
  "edit",
  "version",
  "remix",
  "live",
  "song",
]);

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (value = "") =>
  normalizeText(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));

const incrementMap = (map, key, amount) => {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + amount);
};

const topEntries = (map, limit) =>
  [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value]) => value);

function buildUserTasteProfile(likedSongs = [], passedSongs = []) {
  const artistWeights = new Map();
  const albumWeights = new Map();
  const keywordWeights = new Map();
  const dislikedArtistWeights = new Map();
  const dislikedKeywordWeights = new Map();

  likedSongs.forEach((song, index) => {
    const recencyBoost = Math.max(1, likedSongs.length - index);
    const baseWeight = 2 + recencyBoost;

    incrementMap(artistWeights, normalizeText(song.artist), baseWeight * 3);
    incrementMap(albumWeights, normalizeText(song.album), baseWeight * 2);

    tokenize(song.title).forEach((token) => {
      incrementMap(keywordWeights, token, baseWeight * 1.6);
    });

    tokenize(song.artist).forEach((token) => {
      incrementMap(keywordWeights, token, baseWeight * 1.2);
    });
  });

  passedSongs.forEach((song) => {
    const artistKey = normalizeText(song.artist);

    if (artistKey) {
      incrementMap(dislikedArtistWeights, artistKey, 3);
    }

    tokenize(song.title).forEach((token) => incrementMap(dislikedKeywordWeights, token, 1));
  });

  return {
    topArtists: topEntries(artistWeights, 5),
    topAlbums: topEntries(albumWeights, 3),
    topKeywords: topEntries(keywordWeights, 8),
    dislikedArtistWeights,
    dislikedKeywordWeights,
  };
}

function buildRecommendationQueries(profile, fallbackQuery) {
  const queries = [];
  const seen = new Set();

  const pushQuery = (value) => {
    const normalized = String(value || "").trim();

    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    queries.push(normalized);
  };

  profile.topArtists.forEach((artist) => {
    pushQuery(`artist:${artist}`);
  });

  profile.topAlbums.forEach((album) => {
    pushQuery(`album:${album}`);
  });

  for (let i = 0; i < profile.topArtists.length; i += 1) {
    const artist = profile.topArtists[i];
    const keyword = profile.topKeywords[i];

    if (artist && keyword) {
      pushQuery(`artist:${artist} ${keyword}`);
    }
  }

  for (let i = 0; i < profile.topKeywords.length; i += 2) {
    const keywordA = profile.topKeywords[i];
    const keywordB = profile.topKeywords[i + 1];
    pushQuery([keywordA, keywordB].filter(Boolean).join(" "));
  }

  if (fallbackQuery) {
    pushQuery(fallbackQuery);
  }

  DEFAULT_DISCOVERY_QUERIES.forEach(pushQuery);

  return queries.slice(0, 10);
}

function scoreTrack(track, profile) {
  const primaryArtist = normalizeText(track.artists?.[0]?.name || "");
  const albumName = normalizeText(track.album?.name || "");
  const titleTokens = tokenize(track.name);
  const artistTokens = tokenize(track.artists?.map((artist) => artist.name).join(" "));

  let score = 0;

  if (profile.topArtists.includes(primaryArtist)) {
    score += 10;
  }

  if (profile.topAlbums.includes(albumName)) {
    score += 6;
  }

  score += titleTokens.filter((token) => profile.topKeywords.includes(token)).length * 2.5;
  score += artistTokens.filter((token) => profile.topKeywords.includes(token)).length * 1.5;
  score += (track.popularity || 0) / 25;
  score -= (profile.dislikedArtistWeights.get(primaryArtist) || 0) * 1.5;
  score -= titleTokens.reduce(
    (total, token) => total + (profile.dislikedKeywordWeights.get(token) || 0) * 0.75,
    0
  );

  if (track.preview_url) {
    score += 1.5;
  }

  return score;
}

async function fetchSearchTracks(token, query, limit = 10, offset = 0) {
  const safeLimit = Math.max(1, Math.min(10, Number(limit) || 10));
  const safeOffset = Math.max(0, Number(offset) || 0);

  try {
    const response = await axios.get("https://api.spotify.com/v1/search", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        q: query,
        type: "track",
        limit: safeLimit,
        offset: safeOffset,
      },
    });

    return response?.data?.tracks?.items || [];
  } catch (error) {
    console.error("Spotify search failed:", {
      query,
      limit: safeLimit,
      offset: safeOffset,
      detail: error.response?.data || error.message,
    });

    return [];
  }
}

async function getUserSongSnapshots(uid) {
  const [likedSnapshot, passedSnapshot] = await Promise.all([
    db.collection("users").doc(uid).collection("likedSongs").get(),
    db.collection("users").doc(uid).collection("passedSongs").get(),
  ]);

  const likedSongs = likedSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => {
      const aTime = a.likedAt?._seconds || 0;
      const bTime = b.likedAt?._seconds || 0;
      return bTime - aTime;
    });

  const passedSongs = passedSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => {
      const aTime = a.passedAt?._seconds || 0;
      const bTime = b.passedAt?._seconds || 0;
      return bTime - aTime;
    });

  return { likedSongs, passedSongs };
}

function formatTrack(track) {
  return {
    spotifyId: track.id,
    title: track.name,
    artist: track.artists?.[0]?.name || "",
    album: track.album?.name || "",
    imageUrl: track.album?.images?.[0]?.url || "",
    previewUrl: track.preview_url || "",
    popularity: track.popularity || 0,
  };
}

async function collectRankedTracks({
  token,
  queries,
  excludedIds,
  profile,
  minimumResults = 12,
}) {
  const trackById = new Map();
  const offsets = [0, 10, 20];

  for (const query of queries) {
    for (const offset of offsets) {
      const tracks = await fetchSearchTracks(token, query, 10, offset);

      tracks.forEach((track) => {
        if (!track?.id || excludedIds.has(track.id)) {
          return;
        }

        const score = profile ? scoreTrack(track, profile) : (track.popularity || 0) / 25;
        const existing = trackById.get(track.id);
        const enrichedTrack = { ...track, _recommendationScore: score };

        if (!existing || existing._recommendationScore < score) {
          trackById.set(track.id, enrichedTrack);
        }
      });

      if (trackById.size >= minimumResults) {
        return [...trackById.values()];
      }
    }
  }

  return [...trackById.values()];
}

// Get Spotify access token
async function getSpotifyToken() {
  const response = await axios.post(
    "https://accounts.spotify.com/api/token",
    "grant_type=client_credentials",
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString("base64"),
      },
    }
  );

  return response.data.access_token;
}

// GET /
// Checks if backend is running
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// GET /test-db
// Tests Firestore connection by returning test user document
app.get("/test-db", async (req, res) => {
  try {
    const doc = await db.collection("users").doc("testUser123").get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Test user not found" });
    }

    res.json(doc.data());
  } catch (error) {
    console.error("Error reading Firestore:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /songs?q=...
// Fetch songs from Spotify based on a direct query or a personalized profile
app.get("/songs", async (req, res) => {
  try {
    const token = await getSpotifyToken();
    const query = String(req.query.q || "").trim();
    const uid = req.query.uid;
    const personalized =
      req.query.personalized === "true" || (!query && Boolean(uid));

    console.log("GET /songs called with:", { query, uid, personalized });

    let excludedIds = new Set();
    let likedSongs = [];
    let passedSongs = [];

    if (uid) {
      const snapshots = await getUserSongSnapshots(uid);
      likedSongs = snapshots.likedSongs;
      passedSongs = snapshots.passedSongs;

      excludedIds = new Set([
        ...likedSongs.map((song) => song.id || song.spotifyId),
        ...passedSongs.map((song) => song.id || song.spotifyId),
      ]);
    }

    let songs = [];

    if (personalized && likedSongs.length > 0) {
      const profile = buildUserTasteProfile(likedSongs, passedSongs);
      const recommendationQueries = buildRecommendationQueries(profile, query);

      console.log("Personalized recommendation queries:", recommendationQueries);

      let rankedTracks = await collectRankedTracks({
        token,
        queries: recommendationQueries,
        excludedIds,
        profile,
        minimumResults: 12,
      });

      if (rankedTracks.length < 8) {
        const fallbackTracks = await collectRankedTracks({
          token,
          queries: DEFAULT_DISCOVERY_QUERIES,
          excludedIds,
          profile,
          minimumResults: 12,
        });

        fallbackTracks.forEach((track) => {
          const existing = rankedTracks.find((candidate) => candidate.id === track.id);

          if (!existing) {
            rankedTracks.push(track);
          }
        });
      }

      songs = rankedTracks
        .sort((a, b) => b._recommendationScore - a._recommendationScore)
        .slice(0, 12)
        .map(formatTrack);
    } else {
      const directQuery = query || DEFAULT_DISCOVERY_QUERIES[0];

      console.log("Spotify search query:", directQuery);

      const items = await collectRankedTracks({
        token,
        queries: [directQuery, ...DEFAULT_DISCOVERY_QUERIES],
        excludedIds,
        minimumResults: 12,
      });

      songs = items
        .map(formatTrack);
    }

    res.json(songs);
  } catch (error) {
    console.error("GET /songs failed:", error.response?.data || error.message || error);
    res.status(500).json({
      error: "Failed to fetch songs",
      detail: error.response?.data || error.message || "Unknown error",
    });
  }
});

app.get("/preview", async (req, res) => {
  try {
    const song = req.query.song || "";
    const artist = req.query.artist || "";

    if (!song) {
      return res.status(400).json({ error: "Missing song name" });
    }

    const cleanSong = song
      .replace(/\(feat\..*?\)/gi, "")
      .replace(/\(ft\..*?\)/gi, "")
      .replace(/\+.*$/g, "")
      .replace(/-.*$/g, "")
      .trim();

    let previewUrl = "";

    let result = await spotifyPreviewFinder(song, artist, 1);

    if (
      result.success &&
      result.results &&
      result.results.length > 0 &&
      result.results[0].previewUrls &&
      result.results[0].previewUrls.length > 0
    ) {
      previewUrl = result.results[0].previewUrls[0];
    }

    if (!previewUrl && cleanSong && cleanSong !== song) {
      result = await spotifyPreviewFinder(cleanSong, artist, 1);

      if (
        result.success &&
        result.results &&
        result.results.length > 0 &&
        result.results[0].previewUrls &&
        result.results[0].previewUrls.length > 0
      ) {
        previewUrl = result.results[0].previewUrls[0];
      }
    }

    res.json({ previewUrl });
  } catch (error) {
    console.error("Preview finder error:", error.message);
    res.status(500).json({ error: "Failed to fetch preview" });
  }
});

app.get("/likedCount/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    const snapshot = await db
      .collection("users")
      .doc(uid)
      .collection("likedSongs")
      .get();

    res.json({ count: snapshot.size });
  } catch (error) {
    console.error("Error reading liked count:", error);
    res.status(500).json({ error: error.message });
  }
});


app.get("/passedCount/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    const snapshot = await db
      .collection("users")
      .doc(uid)
      .collection("passedSongs")
      .get();

    res.json({ count: snapshot.size });
  } catch (error) {
    console.error("Error reading passed count:", error);
    res.status(500).json({ error: error.message });
  }
});


// POST /like
// Save liked song for a user
app.post("/like", async (req, res) => {
  try {
    const { uid, song } = req.body;

    if (!uid || !song || !song.spotifyId) {
      return res.status(400).json({ error: "Missing uid or song data" });
    }

    await db
      .collection("users")
      .doc(uid)
      .collection("likedSongs")
      .doc(song.spotifyId)
      .set({
        spotifyId: song.spotifyId,
        title: song.title || "",
        artist: song.artist || "",
        album: song.album || "",
        imageUrl: song.imageUrl || "",
        previewUrl: song.previewUrl || "",
        likedAt: new Date(),
      });

    res.json({ message: "Song saved successfully" });
  } catch (error) {
    console.error("Error saving song:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/pass", async (req, res) => {
  try {
    const { uid, song } = req.body;

    if (!uid || !song || !song.spotifyId) {
      return res.status(400).json({ error: "Missing uid or song data" });
    }

    await db
      .collection("users")
      .doc(uid)
      .collection("passedSongs")
      .doc(song.spotifyId)
      .set({
        spotifyId: song.spotifyId,
        title: song.title || "",
        artist: song.artist || "",
        album: song.album || "",
        imageUrl: song.imageUrl || "",
        previewUrl: song.previewUrl || "",
        passedAt: new Date(),
      });

    res.json({ message: "Song passed successfully" });
  } catch (error) {
    console.error("Error saving passed song:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /likedSongs/:uid
// Retrieve liked songs for a user
app.get("/likedSongs/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    const snapshot = await db
      .collection("users")
      .doc(uid)
      .collection("likedSongs")
      .get();

    const likedSongs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(likedSongs);
  } catch (error) {
    console.error("Error reading liked songs:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/passedSongs/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    const snapshot = await db
      .collection("users")
      .doc(uid)
      .collection("passedSongs")
      .get();

    const passedSongs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(passedSongs);
  } catch (error) {
    console.error("Error reading passed songs:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
