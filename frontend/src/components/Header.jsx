import React from 'react';

const Header = ({
  activeView,
  onChangeView,
  likedCount = 0,
  passedCount = 0,
  sessionLikedCount = 0,
  dataMode = 'syncing',
}) => (
  <header className="panel-surface flex flex-col gap-4 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1ed760] shadow-[0_18px_50px_rgba(30,215,96,0.28)]">
        <SpotifyIcon className="h-5 w-5 fill-black" />
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-white/35">Spotify Tinder</p>
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Tune<span className="text-[#7bffba]">Swipe</span>
        </h1>
      </div>
    </div>

    <nav className="flex flex-wrap gap-2">
      <HeaderTab
        isActive={activeView === 'discover'}
        onClick={() => onChangeView('discover')}
        label="Discover"
      />
      <HeaderTab
        isActive={activeView === 'liked'}
        onClick={() => onChangeView('liked')}
        label={`Liked Songs (${likedCount})`}
      />
    </nav>

    <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
      <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5">
        <span className="font-semibold text-emerald-200">{sessionLikedCount}</span> liked
      </div>
      <div className="rounded-full border border-rose-300/20 bg-rose-300/10 px-3 py-1.5">
        <span className="font-semibold text-rose-200">{passedCount}</span> passed
      </div>
      <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
        {dataMode === 'backend' ? 'Synced' : dataMode === 'syncing' ? 'Syncing' : 'Local backup'}
      </div>
    </div>
  </header>
);

const HeaderTab = ({ isActive, onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-white text-black shadow-[0_12px_30px_rgba(255,255,255,0.18)]'
        : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
    }`}
  >
    {label}
  </button>
);

const SpotifyIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
  </svg>
);

export default Header;
