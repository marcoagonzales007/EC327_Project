import React, { useState, useCallback, useEffect } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import AuthScreen from "./components/AuthScreen";
import Header from './components/Header';
import CardStack from './components/CardStack';
import AccountView from "./components/AccountView";

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
  const [activeView, setActiveView] = useState("discover");
  const [likedSongs, setLikedSongs] = useState([]);
  const [passedSongs, setPassedSongs] = useState([]);
  const [accountLoading, setAccountLoading] = useState(false);


  const fetchRecommendations = useCallback(async (append = false, seedQuery = "") => {
    if (!user) return;

    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        uid: user.uid,
        personalized: "true",
      });

      if (seedQuery) {
        params.set("q", seedQuery);
      }

      const res = await fetch(`http://localhost:3000/songs?${params.toString()}`);
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
        console.log("No recommendations returned");
        return;
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
    } catch (err) {
      console.error("Error fetching recommendations:", err);
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

  const loadAccountData = useCallback(async () => {
    if (!user) return;

    setAccountLoading(true);

    try {
      const [likedRes, passedRes] = await Promise.all([
        fetch(`http://localhost:3000/likedSongs/${user.uid}`),
        fetch(`http://localhost:3000/passedSongs/${user.uid}`),
      ]);

      const [likedData, passedData] = await Promise.all([
        likedRes.json(),
        passedRes.json(),
      ]);

      setLikedSongs(Array.isArray(likedData) ? likedData : []);
      setPassedSongs(Array.isArray(passedData) ? passedData : []);
    } catch (err) {
      console.error("Error loading account activity:", err);
    } finally {
      setAccountLoading(false);
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
        setLikedSongs([]);
        setPassedSongs([]);
        return;
      }

      await Promise.all([loadCounts(), loadAccountData()]);
      fetchRecommendations(false);
    };

    loadUserData();
  }, [user, loadCounts, loadAccountData, fetchRecommendations]);

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
    setLikedSongs((prev) => [
      {
        id: track.id,
        spotifyId: track.id,
        title: track.name,
        artist: track.artists[0]?.name || '',
        album: track.album?.name || '',
        imageUrl: track.album?.images?.[0]?.url || '',
        previewUrl: track.preview_url || '',
      },
      ...prev.filter((song) => (song.spotifyId || song.id) !== track.id),
    ]);

    fetchRecommendations(true, track.artists[0]?.name || track.name || "");

    console.log('❤️ Liked:', track.name);
  }, [user, fetchRecommendations]);

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
    setPassedSongs((prev) => [
      {
        id: track.id,
        spotifyId: track.id,
        title: track.name,
        artist: track.artists[0]?.name || '',
        album: track.album?.name || '',
        imageUrl: track.album?.images?.[0]?.url || '',
        previewUrl: track.preview_url || '',
      },
      ...prev.filter((song) => (song.spotifyId || song.id) !== track.id),
    ]);
    console.log('✕ Passed:', track.name);
  }, [user]);

  const handleReset = useCallback(() => {
    if (!user) return;
    fetchRecommendations(false);
  }, [user, fetchRecommendations]);

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
      <Header
        likedCount={likedCount}
        passedCount={passedCount}
        user={user}
        activeView={activeView}
        onNavigate={setActiveView}
      />

      <main className="flex-1 min-h-0">
        {activeView === "account" ? (
          <div className="h-full overflow-y-auto">
            <AccountView
              user={user}
              likedCount={likedCount}
              passedCount={passedCount}
              likedSongs={likedSongs}
              passedSongs={passedSongs}
              isLoading={accountLoading}
              onBackToDiscover={() => setActiveView("discover")}
              onSignOut={() => signOut(auth)}
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center overflow-hidden px-4 py-6">
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
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
