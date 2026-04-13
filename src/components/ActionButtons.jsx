import React from 'react';
import { motion } from 'framer-motion';

/**
 * ActionButtons — the Pass (✕) and Like (♥) buttons below the card stack.
 *
 * In this checkpoint they call onPass / onLike directly.
 * In Checkpoint 3 they will call programmatic swipe methods on the card ref.
 */
const ActionButtons = ({ onPass, onLike, disabled = false }) => (
  <div className="flex-shrink-0 flex items-center justify-center gap-8 pb-2">

    {/* Pass button */}
    <ActionButton
      onClick={onPass}
      disabled={disabled}
      aria-label="Pass"
      colorClass="border-red-500 text-red-500 hover:bg-red-500/10"
      size="md"
    >
      {/* X icon */}
      <svg
        viewBox="0 0 24 24"
        className="w-7 h-7"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        aria-hidden
      >
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </ActionButton>

    {/* Like button — slightly larger to signal primary action */}
    <ActionButton
      onClick={onLike}
      disabled={disabled}
      aria-label="Like"
      colorClass="border-spotify-green text-spotify-green hover:bg-spotify-green/10 shadow-green-glow"
      size="lg"
    >
      {/* Heart icon */}
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor" aria-hidden>
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
                 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
                 C13.09 3.81 14.76 3 16.5 3
                 19.58 3 22 5.42 22 8.5
                 c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </ActionButton>

  </div>
);

// ─── Reusable button atom ──────────────────────────────────────────────────────
const ActionButton = ({ onClick, disabled, colorClass, size, children, 'aria-label': label }) => (
  <motion.button
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    className={`
      ${size === 'lg' ? 'w-16 h-16' : 'w-14 h-14'}
      rounded-full border-2 flex items-center justify-center
      transition-colors duration-150 shadow-lg
      disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none
      ${colorClass}
    `}
    whileHover={!disabled ? { scale: 1.12 } : {}}
    whileTap={!disabled  ? { scale: 0.90 } : {}}
    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
  >
    {children}
  </motion.button>
);

export default ActionButtons;