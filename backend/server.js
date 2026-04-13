require("dotenv").config();
const express = require("express");
const db = require("./firebase");
const axios = require("axios");

const app = express();
app.use(express.json());

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
            process.env.SPOTIFY_CLIENT_ID +
              ":" +
              process.env.SPOTIFY_CLIENT_SECRET
          ).toString("base64"),
      },
    }
  );

  return response.data.access_token;
}

app.get("/songs", async (req, res) => {
  try {
    const token = await getSpotifyToken();

    const response = await axios.get(
      "https://api.spotify.com/v1/search",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          q: "pop",
          type: "track",
          limit: 10,
        },
      }
    );

    const songs = response.data.tracks.items.map((track) => ({
      spotifyId: track.id,
      title: track.name,
      artist: track.artists[0]?.name || "",
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


app.get("/", (req, res) => {
  console.log("Root route hit");
  res.send("Backend is running");
});

app.get("/test-db", async (req, res) => {
  try {
    const doc = await db.collection("users").doc("testUser123").get();

    if (!doc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(doc.data());
  } catch (error) {
    console.error("Error reading Firestore:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Server running on port 3000");
});

app.post("/like", async (req, res) => {
  const { uid, song } = req.body;

  try {
    await db
      .collection("users")
      .doc(uid)
      .collection("likedSongs")
      .doc(song.spotifyId)
      .set({
        spotifyId: song.spotifyId,
        title: song.title,
        artist: song.artist,
        album: song.album || "",
        imageUrl: song.imageUrl || "",
        previewUrl: song.previewUrl || "",
        likedAt: new Date(),
      });

    res.status(200).json({ message: "Song saved successfully" });
  } catch (error) {
    console.error("Error saving song:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/likedSongs/:uid", async (req, res) => {
  const { uid } = req.params;

  try {
    const snapshot = await db
      .collection("users")
      .doc(uid)
      .collection("likedSongs")
      .get();

    const songs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(songs);
  } catch (error) {
    console.error("Error reading liked songs:", error);
    res.status(500).json({ error: error.message });
  }
});