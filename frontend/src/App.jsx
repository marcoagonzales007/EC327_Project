import React, { useState, useCallback, useEffect } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import AuthScreen from "./components/AuthScreen";
import Header from './components/Header';
import CardStack from './components/CardStack';

const formatSongs = (data) =>
  data.map((song) => ({
    id: song.spotifyId,
    name: song.title,
    artists: [{ name: song.artist }],
    album: {
      name: song.album,
      images: [{ url: song.imageUrl }],
    },
    preview_url: song.previewUrl,
    popularity: 50,
  }));

const App = () => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [deck, setDeck] = useState([]);
  const [likedCount, setLikedCount] = useState(0);
  const [passedCount, setPassedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);


  const getInitialQueries = useCallback(async () => {
    if (!user) return ["pop", "drake", "weeknd"];

    try {
      const res = await fetch(`http://localhost:3000/likedSongs/${user.uid}`);
      const likedSongs = await res.json();

      if (!Array.isArray(likedSongs) || likedSongs.length === 0) {
        return ["pop", "drake", "weeknd"];
      }

      const sorted = [...likedSongs].sort((a, b) => {
        const aTime = a.likedAt?._seconds || 0;
        const bTime = b.likedAt?._seconds || 0;
        return bTime - aTime;
      });

      const artistQueries = sorted
        .map((song) => song.artist)
        .filter(Boolean);

      const titleQueries = sorted
        .map((song) => song.title)
        .filter(Boolean);

      return [...new Set([...artistQueries, ...titleQueries, "pop", "drake", "weeknd"])];
    } catch (err) {
      console.error("Error getting liked songs for initial queries:", err);
      return ["pop", "drake", "weeknd"];
    }
  }, [user]);

  const fetchSongsFromQueries = useCallback(async (queries, append = false) => {
    if (!user) return;

    setIsLoading(true);

    try {
      for (const query of queries) {
        const res = await fetch(
          `http://localhost:3000/songs?q=${encodeURIComponent(query)}&uid=${user.uid}`
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            typeof data.detail === "string"
              ? data.detail
              : JSON.stringify(data.detail || data.error || "Failed to fetch songs")
          );
        }

        console.log("Songs from backend:", data);

        if (!Array.isArray(data) || data.length === 0) {
          continue;
        }

        const formatted = formatSongs(data);

        setDeck((prev) => {
          const existingIds = new Set(prev.map((track) => track.id));
          const newTracks = formatted.filter((track) => !existingIds.has(track.id));

          if (!append && newTracks.length === 0) {
            return prev;
          }

          return append ? [...prev, ...newTracks] : newTracks;
        });

        return;
      }

      console.log("No songs found from any query");
    } catch (err) {
      console.error("Error fetching songs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    signOut(auth);
  }, []);

  const loadCounts = useCallback(async () => {
    if (!user) return;

    try {
      const [likedRes, passedRes] = await Promise.all([
        fetch(`http://localhost:3000/likedCount/${user.uid}`),
        fetch(`http://localhost:3000/passedCount/${user.uid}`),
      ]);

      const likedData = await likedRes.json();
      const passedData = await passedRes.json();

      setLikedCount(likedData.count || 0);
      setPassedCount(passedData.count || 0);
    } catch (err) {
      console.error("Error loading counts:", err);
    }
  }, [user]);

  const fetchSongs = useCallback((query = 'pop', append = false) => {
    if (!user) return;

    setIsLoading(true);

    fetch(`http://localhost:3000/songs?q=${encodeURIComponent(query)}&uid=${user.uid}`)
      .then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            typeof data.detail === "string"
              ? data.detail
              : JSON.stringify(data.detail || data.error || "Failed to fetch songs")
          );
        }

        return data;
      })
      .then((data) => {
        console.log('Songs from backend:', data);

        if (!data.length && query === 'pop') {
          return fetch(`http://localhost:3000/songs?q=drake&uid=${user.uid}`)
            .then(async (res) => {
              const fallbackData = await res.json();

              if (!res.ok) {
                throw new Error(
                  typeof fallbackData.detail === "string"
                    ? fallbackData.detail
                    : JSON.stringify(fallbackData.detail || fallbackData.error || "Failed to fetch fallback songs")
                );
              }

              return fallbackData;
            })
            .then((fallbackData) => {
              console.log('Fallback songs from backend:', fallbackData);

              const formatted = formatSongs(fallbackData);

              setDeck((prev) => {
                const existingIds = new Set(prev.map((track) => track.id));
                const newTracks = formatted.filter((track) => !existingIds.has(track.id));

                if (!append && newTracks.length === 0) {
                  return prev;
                }

                return append ? [...prev, ...newTracks] : newTracks;
              });
            });
        }

        const formatted = formatSongs(data);

        setDeck((prev) => {
          const existingIds = new Set(prev.map((track) => track.id));
          const newTracks = formatted.filter((track) => !existingIds.has(track.id));

          // don't wipe out existing deck with an empty response
          if (!append && newTracks.length === 0) {
            return prev;
          }

          return append ? [...prev, ...newTracks] : newTracks;
        });
      })
      .catch((err) => {
        console.error('Error fetching songs:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [user]);

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) {
        setLikedCount(0);
        setPassedCount(0);
        setDeck([]);
        return;
      }

      await loadCounts();

      const initialQueries = await getInitialQueries();
      fetchSongsFromQueries(initialQueries);
    };

    loadUserData();
  }, [user, loadCounts, fetchSongsFromQueries, getInitialQueries]);

  const handleLike = useCallback((track) => {
    if (!user) return;

    console.log("HANDLE LIKE CALLED:", track);

    fetch('http://localhost:3000/like', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uid: user.uid,
        song: {
          spotifyId: track.id,
          title: track.name,
          artist: track.artists[0]?.name || '',
          album: track.album?.name || '',
          imageUrl: track.album?.images?.[0]?.url || '',
          previewUrl: track.preview_url || '',
        },
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('Saved liked song:', data);
      })
      .catch((err) => {
        console.error('Error saving liked song:', err);
      });

    setDeck((prev) => prev.filter((t) => t.id !== track.id));
    setLikedCount((prev) => prev + 1);

    const queries = [
      track.artists[0]?.name,
      track.name,
      "drake",
      "weeknd",
      "pop",
    ].filter(Boolean);

    fetchSongsFromQueries(queries, true);

    console.log('❤️ Liked:', track.name);
  }, [user, fetchSongs]);

  const handlePass = useCallback((track) => {
    if (!user) return;

    console.log("HANDLE PASS CALLED:", track);

    fetch('http://localhost:3000/pass', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uid: user.uid,
        song: {
          spotifyId: track.id,
          title: track.name,
          artist: track.artists[0]?.name || '',
          album: track.album?.name || '',
          imageUrl: track.album?.images?.[0]?.url || '',
          previewUrl: track.preview_url || '',
        },
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('Saved passed song:', data);
      })
      .catch((err) => {
        console.error('Error saving passed song:', err);
      });

    setDeck((prev) => prev.filter((t) => t.id !== track.id));
    setPassedCount((prev) => prev + 1);
    console.log('✕ Passed:', track.name);
  }, [user]);

  const handleReset = useCallback(() => {
    if (!user) return;
    fetchSongs();
  }, [user, fetchSongs]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="h-full flex flex-col bg-[#121212]">
      <div className="p-4 flex justify-end">
        <button
          onClick={() => signOut(auth)}
          className="text-sm text-gray-300 hover:text-white transition"
        >
          Log out
        </button>
      </div>

      <Header likedCount={likedCount} passedCount={passedCount} />

      <main className="flex-1 flex items-center justify-center overflow-hidden min-h-0 px-4 py-6">
        <div className="relative w-full max-w-sm h-[70vh] max-h-[720px]">
          <CardStack
            deck={deck}
            onLike={handleLike}
            onPass={handlePass}
            isLoading={isLoading}
            isEmpty={!isLoading && deck.length === 0}
            onReset={handleReset}
          />
        </div>
      </main>
    </div>
  );
};

export default App;