require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const db = require("./firebase");
const spotifyPreviewFinder = require("spotify-preview-finder");

const app = express();

app.use(cors({
  origin: "http://localhost:5173"
}));
app.use(express.json());

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
// Fetch songs from Spotify based on search query
app.get("/songs", async (req, res) => {
  try {
    const token = await getSpotifyToken();
    const query = req.query.q || "pop";
    const uid = req.query.uid || "testUser123";

    const likedSnapshot = await db
      .collection("users")
      .doc(uid)
      .collection("likedSongs")
      .get();

    const passedSnapshot = await db
      .collection("users")
      .doc(uid)
      .collection("passedSongs")
      .get();

    const excludedIds = new Set([
      ...likedSnapshot.docs.map((doc) => doc.id),
      ...passedSnapshot.docs.map((doc) => doc.id),
    ]);

    const response = await axios.get("https://api.spotify.com/v1/search", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        q: query,
        type: "track",
        limit: 10,
      },
    });

    const songs = response.data.tracks.items
      .filter((track) => !excludedIds.has(track.id))
      .map((track) => ({
        spotifyId: track.id,
        title: track.name,
        artist: track.artists?.[0]?.name || "",
        album: track.album?.name || "",
        imageUrl: track.album?.images?.[0]?.url || "",
        previewUrl: track.preview_url || "",
      }));

    res.json(songs);
  } catch (error) {
    console.error("Spotify error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch songs" });
  }
});

app.get("/preview", async (req, res) => {
  try {
    const song = req.query.song || "";
    const artist = req.query.artist || "";

    if (!song) {
      return res.status(400).json({ error: "Missing song name" });
    }

    const result = await spotifyPreviewFinder(song, artist, 1);

    let previewUrl = "";

    if (
      result.success &&
      result.results &&
      result.results.length > 0 &&
      result.results[0].previewUrls &&
      result.results[0].previewUrls.length > 0
    ) {
      previewUrl = result.results[0].previewUrls[0];
    }

    res.json({ previewUrl });
  } catch (error) {
    console.error("Preview finder error:", error.message);
    res.status(500).json({ error: "Failed to fetch preview" });
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

// Start server
const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});