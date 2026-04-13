import React from 'react';

/**
 * Header — top bar with logo + placeholder user avatar.
 * Stats (likedCount, passedCount) are wired up in Checkpoint 2.
 */
const Header = ({ likedCount = 0, passedCount = 0 }) => (
  <header className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/5">

    {/* Logo */}
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-spotify-green flex items-center justify-center">
        <SpotifyIcon className="w-4 h-4 fill-black" />
      </div>
      <span className="text-white font-bold text-lg leading-none">
        Tune<span className="text-spotify-green">Swipe</span>
      </span>
    </div>

    {/* Session counters */}
    <div className="flex items-center gap-3 text-xs text-gray-400">
      <span>
        <span className="text-spotify-green font-bold">{likedCount}</span> liked
      </span>
      <div className="w-px h-3 bg-gray-700" />
      <span>
        <span className="text-red-400 font-bold">{passedCount}</span> passed
      </span>
    </div>

    {/* Placeholder avatar circle — replaced with real user data in Checkpoint 2 */}
    <div className="w-8 h-8 rounded-full bg-spotify-gray flex items-center justify-center border border-white/10">
      <span className="text-xs text-gray-400">?</span>
    </div>
  </header>
);

const SpotifyIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
  </svg>
);

export default Header;