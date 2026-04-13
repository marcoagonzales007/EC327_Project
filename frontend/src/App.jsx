import React, { useState, useCallback } from 'react';
import { PLACEHOLDER_TRACKS } from './data/placeholderTracks';
import Header    from './components/Header';
import CardStack from './components/CardStack';

const App = () => {
  const [deck,        setDeck]        = useState(PLACEHOLDER_TRACKS);
  const [likedCount,  setLikedCount]  = useState(0);
  const [passedCount, setPassedCount] = useState(0);

  const handleLike = useCallback((track) => {
    setDeck(prev => prev.filter(t => t.id !== track.id));
    setLikedCount(prev => prev + 1);
    console.log('❤️  Liked:', track.name);
  }, []);

  const handlePass = useCallback((track) => {
    setDeck(prev => prev.filter(t => t.id !== track.id));
    setPassedCount(prev => prev + 1);
    console.log('✕  Passed:', track.name);
  }, []);

  const handleReset = useCallback(() => {
    setDeck(PLACEHOLDER_TRACKS);
    setLikedCount(0);
    setPassedCount(0);
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#121212]">
      <Header likedCount={likedCount} passedCount={passedCount} />

      <main className="flex-1 flex flex-col overflow-hidden">
        <CardStack
          deck={deck}
          onLike={handleLike}
          onPass={handlePass}
          isLoading={false}
          isEmpty={deck.length === 0}
          onReset={handleReset}
        />
      </main>
    </div>
  );
};

export default App;