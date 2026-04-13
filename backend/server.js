const express = require("express");
const db = require("./firebase");

const app = express();
app.use(express.json());

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