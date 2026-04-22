import React from 'react';
import LoadingSpinner from './LoadingSpinner';

const PlaylistPanel = ({
  isLoading,
  tracks,
  onBackToDiscover,
  onUseRecommendation,
  onRefresh,
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-white/65">Loading your liked songs...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-white/10 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">Playlist View</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Liked Songs</h2>
            <p className="mt-1 text-sm text-white/65">
              Review what you saved and jump back into a recommendation path from any track.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="secondary-button" onClick={onRefresh}>
              Refresh
            </button>
            <button type="button" className="primary-button" onClick={onBackToDiscover}>
              Back to Swipe
            </button>
          </div>
        </div>
      </div>

      {!tracks.length ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="text-5xl">♪</div>
          <h3 className="text-xl font-semibold text-white">No liked songs yet</h3>
          <p className="max-w-md text-sm leading-6 text-white/65">
            Start swiping in the discover view and your saved tracks will appear here automatically.
          </p>
          <button type="button" className="primary-button" onClick={onBackToDiscover}>
            Start Discovering
          </button>
        </div>
      ) : (
        <div className="grid gap-3 overflow-y-auto px-5 py-5 sm:px-6">
          {tracks.map((track) => {
            const artist = track.artists?.map((item) => item.name).join(', ') || 'Unknown artist';
            const image = track.album?.images?.[0]?.url;

            return (
              <article
                key={track.id}
                className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="h-20 w-20 overflow-hidden rounded-3xl bg-white/10">
                    {image ? (
                      <img
                        src={image}
                        alt={`${track.name} cover`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl text-white/35">
                        ♪
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold text-white">{track.name}</h3>
                    <p className="truncate text-sm text-white/70">{artist}</p>
                    <p className="truncate text-xs uppercase tracking-[0.18em] text-white/35">
                      {track.album?.name || 'Single'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => onUseRecommendation({
                      query: track.artists?.[0]?.name || track.name,
                      title: `Because you liked ${track.name}`,
                      description: 'A simple recommendation pass based on one of your saved tracks.',
                    })}
                  >
                    Use for Recommendations
                  </button>

                  {track.preview_url && (
                    <a
                      className="secondary-button"
                      href={track.preview_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Preview Audio
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PlaylistPanel;
