require("dotenv").config();
const express = require("express");
const axios = require("axios");
const db = require("./firebase");

const app = express();
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
            process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET
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
    const doc = await db.collection("users").doc("testUser").get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Test user not found" });
    }

    res.json(doc.data());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /songs?q=...
// Fetch songs from Spotify based on search query
app.get("/songs", async (req, res) => {
  try {
    const token = await getSpotifyToken();
    const query = req.query.q;

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

    const songs = response.data.tracks.items.map((track) => ({
      spotifyId: track.id,
      title: track.name,
      artist: track.artists[0]?.name || "",
      album: track.album?.name || "",
      imageUrl: track.album?.images[0]?.url || "",
      previewUrl: track.preview_url || "",
    }));

    res.json(songs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /like
// Save liked song for a user
app.post("/like", async (req, res) => {
  try {
    const { uid, song } = req.body;

    await db
      .collection("users")
      .doc(uid)
      .collection("likedSongs")
      .doc(song.spotifyId)
      .set({
        spotifyId: song.spotifyId,
        title: song.title,
        artist: song.artist,
        album: song.album,
        imageUrl: song.imageUrl,
        previewUrl: song.previewUrl,
        likedAt: new Date(),
      });

    res.json({ message: "Song saved successfully" });
  } catch (error) {
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

    const likedSongs = snapshot.docs.map((doc) => doc.data());

    res.json(likedSongs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});