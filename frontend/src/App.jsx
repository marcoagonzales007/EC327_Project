import React, { useState, useCallback, useEffect } from 'react';
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
  const [deck, setDeck] = useState([]);
  const [likedCount, setLikedCount] = useState(0);
  const [passedCount, setPassedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSongs = useCallback((query = 'pop', append = false) => {
    setIsLoading(true);

    fetch(`http://localhost:3000/songs?q=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((data) => {
        console.log('Songs from backend:', data);
        const formatted = data.map((song) => ({
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

        setDeck((prev) => {
          const existingIds = new Set(prev.map((track) => track.id));
          const newTracks = formatted.filter((track) => !existingIds.has(track.id));

          return append ? [...prev, ...newTracks] : newTracks;
        });
      })
      .catch((err) => {
        console.error('Error fetching songs:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  const handleLike = useCallback((track) => {
    fetch('http://localhost:3000/like', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uid: 'testUser123',
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

    const artistName = track.artists[0]?.name;
    if (artistName) {
      fetchSongs(artistName, true);
    }

    console.log('❤️ Liked:', track.name);
  }, [fetchSongs]);

  const handlePass = useCallback((track) => {
    setDeck((prev) => prev.filter((t) => t.id !== track.id));
    setPassedCount((prev) => prev + 1);
    console.log('✕ Passed:', track.name);
  }, []);

  const handleReset = useCallback(() => {
    setLikedCount(0);
    setPassedCount(0);
    fetchSongs();
  }, [fetchSongs]);

  return (
    <div className="h-full flex flex-col bg-[#121212]">
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