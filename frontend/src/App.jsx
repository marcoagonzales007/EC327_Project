import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import CardStack from './components/CardStack';
import PlaylistPanel from './components/PlaylistPanel';
import {
  fetchLikedSongs,
  fetchSongs,
  saveLikedSong,
  savePassedSong,
} from './lib/api';

const DEFAULT_QUERY = 'pop';
const DEFAULT_UID = 'testUser123';

const App = () => {
  const [activeView, setActiveView] = useState('discover');
  const [queryInput, setQueryInput] = useState(DEFAULT_QUERY);
  const [deck, setDeck] = useState([]);
  const [likedSongs, setLikedSongs] = useState([]);
  const [isDeckLoading, setIsDeckLoading] = useState(true);
  const [isPlaylistLoading, setIsPlaylistLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedTitle, setFeedTitle] = useState('Discover');
  const [feedDescription, setFeedDescription] = useState(
    'Swipe through fresh tracks and build your playlist.',
  );
  const [sessionStats, setSessionStats] = useState({ liked: 0, passed: 0 });
  const [dataMode, setDataMode] = useState('syncing');

  const recommendationChips = useMemo(() => {
    const seen = new Set();
    const chips = [];

    likedSongs.forEach((track) => {
      const artist = track.artists?.[0]?.name;
      const album = track.album?.name;

      if (artist && !seen.has(`artist:${artist}`)) {
        seen.add(`artist:${artist}`);
        chips.push({
          id: `artist:${artist}`,
          label: artist,
          query: artist,
          title: `Because you liked ${artist}`,
          description: 'A simple same-artist recommendation run.',
        });
      }

      if (album && !seen.has(`album:${album}`)) {
        seen.add(`album:${album}`);
        chips.push({
          id: `album:${album}`,
          label: album,
          query: album,
          title: `More like ${album}`,
          description: 'A simple same-album recommendation run.',
        });
      }
    });

    if (!chips.length) {
      return [
        {
          id: 'starter:pop',
          label: 'Top Pop',
          query: 'pop',
          title: 'Top Pop Picks',
          description: 'Start with a broad mix while your taste profile grows.',
        },
        {
          id: 'starter:indie',
          label: 'Indie',
          query: 'indie',
          title: 'Indie Discovery',
          description: 'Try a different lane for your first stack.',
        },
        {
          id: 'starter:hiphop',
          label: 'Hip-Hop',
          query: 'hip hop',
          title: 'Hip-Hop Discovery',
          description: 'Another quick lane to test the feed.',
        },
      ];
    }

    return chips.slice(0, 6);
  }, [likedSongs]);

  const loadLikedSongs = useCallback(async () => {
    setIsPlaylistLoading(true);

    try {
      const { tracks, mode } = await fetchLikedSongs(DEFAULT_UID);
      setLikedSongs(tracks);
      setDataMode(mode);
    } catch {
      setErrorMessage('We could not load your liked songs yet.');
      setDataMode('offline');
    } finally {
      setIsPlaylistLoading(false);
    }
  }, []);

  const loadDeck = useCallback(async ({
    query,
    title,
    description,
  }) => {
    setIsDeckLoading(true);
    setErrorMessage('');

    try {
      const excludedIds = [
        ...likedSongs.map((track) => track.id),
        ...deck.map((track) => track.id),
      ];

      const { tracks, mode } = await fetchSongs({
        uid: DEFAULT_UID,
        query,
        excludedIds,
      });

      setDeck(tracks);
      setFeedTitle(title ?? `Results for "${query}"`);
      setFeedDescription(
        description ?? 'Swipe right to save tracks and left to skip them.',
      );
      setQueryInput(query);
      setDataMode(mode);
      setActiveView('discover');
    } catch {
      setDeck([]);
      setErrorMessage('We hit a snag while loading songs. Try refreshing the stack.');
      setDataMode('offline');
    } finally {
      setIsDeckLoading(false);
    }
  }, [deck, likedSongs]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setIsDeckLoading(true);
      setIsPlaylistLoading(true);

      try {
        const [likedResult, deckResult] = await Promise.all([
          fetchLikedSongs(DEFAULT_UID),
          fetchSongs({ uid: DEFAULT_UID, query: DEFAULT_QUERY }),
        ]);

        if (cancelled) {
          return;
        }

        setLikedSongs(likedResult.tracks);
        setDeck(deckResult.tracks);
        setDataMode(
          likedResult.mode === 'backend' || deckResult.mode === 'backend'
            ? 'backend'
            : 'offline',
        );
      } catch {
        if (!cancelled) {
          setErrorMessage('The app loaded in offline mode. Backend sync will resume once the API is reachable.');
          setDataMode('offline');
        }
      } finally {
        if (!cancelled) {
          setIsDeckLoading(false);
          setIsPlaylistLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLike = useCallback((track) => {
    setDeck((prev) => prev.filter((item) => item.id !== track.id));
    setLikedSongs((prev) => [track, ...prev.filter((item) => item.id !== track.id)]);
    setSessionStats((prev) => ({ ...prev, liked: prev.liked + 1 }));
    setErrorMessage('');

    saveLikedSong(DEFAULT_UID, track).catch(() => {
      setErrorMessage('Saved locally for now. Backend sync for likes is unavailable.');
      setDataMode('offline');
    });
  }, []);

  const handlePass = useCallback((track) => {
    setDeck((prev) => prev.filter((item) => item.id !== track.id));
    setSessionStats((prev) => ({ ...prev, passed: prev.passed + 1 }));
    setErrorMessage('');

    savePassedSong(DEFAULT_UID, track).catch(() => {
      setErrorMessage('Passes are still tracked locally while the backend is offline.');
      setDataMode('offline');
    });
  }, []);

  const handleDiscoverSubmit = useCallback((event) => {
    event.preventDefault();
    const trimmed = queryInput.trim();

    loadDeck({
      query: trimmed || DEFAULT_QUERY,
      title: trimmed ? `Results for "${trimmed}"` : 'Discover',
      description: 'Swipe right to save tracks and left to skip them.',
    });
  }, [loadDeck, queryInput]);

  const handleRecommendation = useCallback((chip) => {
    loadDeck({
      query: chip.query,
      title: chip.title,
      description: chip.description,
    });
  }, [loadDeck]);

  const handleReloadLikedSongs = useCallback(() => {
    loadLikedSongs();
    setActiveView('liked');
  }, [loadLikedSongs]);

  const emptyAction = recommendationChips[0];

  return (
    <div className="app-shell">
      <div className="app-backdrop app-backdrop-aurora" />
      <div className="app-backdrop app-backdrop-grid" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <Header
          activeView={activeView}
          onChangeView={setActiveView}
          likedCount={likedSongs.length}
          passedCount={sessionStats.passed}
          sessionLikedCount={sessionStats.liked}
          dataMode={dataMode}
        />

        <main className="mt-4 grid flex-1 gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.9fr)]">
          <section className="panel-surface flex min-h-[44rem] flex-col overflow-hidden">
            <div className="border-b border-white/10 px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <p className="eyebrow">Music Matchmaker</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    Finish the swipe flow, playlist, and recommendations in one deployable app.
                  </h1>
                  <p className="mt-3 text-sm leading-6 text-white/70 sm:text-base">
                    The frontend now talks to your API when it is available and falls back to local demo mode when it is not, so you can keep iterating without blocking on backend setup.
                  </p>
                </div>

                <div className="status-pill">
                  <span className={`status-dot ${dataMode === 'backend' ? 'status-dot-live' : 'status-dot-offline'}`} />
                  {dataMode === 'backend' ? 'Backend Connected' : dataMode === 'syncing' ? 'Checking API' : 'Offline Fallback'}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {recommendationChips.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    className="chip-button"
                    onClick={() => handleRecommendation(chip)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {activeView === 'discover' ? (
              <>
                <div className="border-b border-white/10 px-5 py-4 sm:px-6">
                  <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleDiscoverSubmit}>
                    <label className="flex-1">
                      <span className="sr-only">Search songs or artists</span>
                      <input
                        value={queryInput}
                        onChange={(event) => setQueryInput(event.target.value)}
                        placeholder="Try pop, Drake, indie, afrobeat..."
                        className="input-shell"
                      />
                    </label>

                    <button type="submit" className="primary-button sm:min-w-36">
                      Refresh Stack
                    </button>
                  </form>

                  <div className="mt-4 flex flex-col gap-1">
                    <h2 className="text-lg font-semibold text-white">{feedTitle}</h2>
                    <p className="text-sm text-white/65">{feedDescription}</p>
                  </div>

                  {errorMessage && (
                    <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-200/10 px-4 py-3 text-sm text-amber-100">
                      {errorMessage}
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col">
                  <CardStack
                    deck={deck}
                    onLike={handleLike}
                    onPass={handlePass}
                    isLoading={isDeckLoading}
                    isEmpty={!isDeckLoading && deck.length === 0}
                    onReset={() => {
                      if (emptyAction) {
                        handleRecommendation(emptyAction);
                      } else {
                        loadDeck({
                          query: DEFAULT_QUERY,
                          title: 'Discover',
                          description: 'Swipe through fresh tracks and build your playlist.',
                        });
                      }
                    }}
                    emptyTitle={likedSongs.length ? 'Stack finished. Keep the vibe going.' : 'No songs left in this stack.'}
                    emptyMessage={
                      likedSongs.length
                        ? 'Jump into a recommendation lane based on what you already liked.'
                        : 'Reload the deck to keep swiping through fresh tracks.'
                    }
                    emptyActionLabel={likedSongs.length && emptyAction ? `Try ${emptyAction.label}` : 'Shuffle Again'}
                  />
                </div>
              </>
            ) : (
              <PlaylistPanel
                isLoading={isPlaylistLoading}
                tracks={likedSongs}
                onBackToDiscover={() => setActiveView('discover')}
                onUseRecommendation={handleRecommendation}
                onRefresh={handleReloadLikedSongs}
              />
            )}
          </section>

          <aside className="panel-surface flex flex-col p-5 sm:p-6">
            <p className="eyebrow">Timeline Coverage</p>
            <div className="mt-3 space-y-4">
              <FeatureCard
                title="Real song feed"
                body="The deck now requests `/songs`, normalizes backend data, and can still render in local fallback mode."
              />
              <FeatureCard
                title="Like and pass persistence"
                body="Swipes update the UI immediately, then sync to `/like` and `/pass` while also storing a local backup."
              />
              <FeatureCard
                title="Playlist page"
                body="Liked songs are available in a dedicated view backed by `/likedSongs/:uid` or local storage when offline."
              />
              <FeatureCard
                title="Basic recommendations"
                body="Recommendation chips and empty states pivot the next stack toward liked artists and albums."
              />
            </div>

            <div className="mt-6 rounded-[28px] border border-white/10 bg-black/20 p-5">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/40">
                Session Snapshot
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Metric label="Liked this run" value={sessionStats.liked} accent="text-emerald-300" />
                <Metric label="Passed this run" value={sessionStats.passed} accent="text-rose-300" />
                <Metric label="Playlist size" value={likedSongs.length} accent="text-sky-300" />
                <Metric label="Cards ready" value={deck.length} accent="text-amber-200" />
              </div>
            </div>

            <div className="mt-6 rounded-[28px] border border-white/10 bg-white/5 p-5 text-sm leading-6 text-white/70">
              <p className="font-medium text-white">Deploy note</p>
              <p className="mt-2">
                Set <code>VITE_API_BASE_URL</code> for production if your backend is not running on <code>http://localhost:3000</code>.
              </p>
            </div>

            <div className="mt-auto pt-6 text-xs uppercase tracking-[0.22em] text-white/35">
              Built to keep working even when the API is still coming together.
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
};

const FeatureCard = ({ title, body }) => (
  <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
    <h3 className="text-lg font-semibold text-white">{title}</h3>
    <p className="mt-2 text-sm leading-6 text-white/68">{body}</p>
  </div>
);

const Metric = ({ label, value, accent }) => (
  <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
    <div className={`text-3xl font-semibold ${accent}`}>{value}</div>
    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/40">{label}</div>
  </div>
);

export default App;
