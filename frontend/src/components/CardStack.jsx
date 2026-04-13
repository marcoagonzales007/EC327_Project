import React, { useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import SongCard      from './SongCard';
import ActionButtons from './ActionButtons';
import LoadingSpinner from './LoadingSpinner';
import EmptyState    from './EmptyState';

/**
 * CardStack — renders the top 3 cards from the deck as a layered stack.
 *
 * Background cards (index 1 & 2) react to the top card being dragged
 * via MotionValues — this runs on the compositor thread (no React re-renders
 * during drag = silky smooth 60 fps on mobile).
 */
const CardStack = ({
  deck,
  onLike,
  onPass,
  isLoading,
  isEmpty,
  onReset,
}) => {
  const topCardRef = useRef(null);

  // topX tracks the horizontal drag offset of the top card (MotionValue).
  // We pass it into useTransform to drive background card scale/position
  // without any setState calls — pure motion interpolation.
  const topX     = useMotionValue(0);
  const bgScale1 = useTransform(topX, [-200, 0, 200], [1.00, 0.96, 1.00]);
  const bgY1     = useTransform(topX, [-200, 0, 200], [6,   12,   6  ]);
  const bgScale2 = useTransform(topX, [-200, 0, 200], [0.95, 0.92, 0.95]);
  const bgY2     = useTransform(topX, [-200, 0, 200], [18,  22,   18  ]);

  const handleLikeButton = useCallback(() => topCardRef.current?.triggerLike(), []);
  const handlePassButton = useCallback(() => topCardRef.current?.triggerPass(), []);

  const card0 = deck[0] ?? null;
  const card1 = deck[1] ?? null;
  const card2 = deck[2] ?? null;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-spotify-light-gray text-sm animate-pulse">
          Building your playlist...
        </p>
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────
  if (isEmpty) {
    return <EmptyState onReset={onReset} />;
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-between py-3 px-4 gap-4 overflow-hidden">

      {/*
        Aspect-ratio container trick:
        paddingBottom % creates a height relative to width.
        136% ≈ a slightly-taller-than-square card (like a phone screen).
        All cards use absolute inset-0 inside this box.
      */}
      <div className="relative w-full max-w-sm" style={{ paddingBottom: '136%' }}>
        <div className="absolute inset-0">

          {/* Card 2 — furthest back */}
          {card2 && (
            <motion.div
              key={card2.id}
              className="absolute inset-0"
              style={{ scale: bgScale2, y: bgY2, zIndex: 10 }}
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 20 }}
            >
              <SongCard track={card2} isTop={false} onLike={onLike} onPass={onPass} />
            </motion.div>
          )}

          {/* Card 1 — middle */}
          {card1 && (
            <motion.div
              key={card1.id}
              className="absolute inset-0"
              style={{ scale: bgScale1, y: bgY1, zIndex: 20 }}
              initial={{ opacity: 0, scale: 0.90 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'spring', stiffness: 240, damping: 22 }}
            >
              <SongCard track={card1} isTop={false} onLike={onLike} onPass={onPass} />
            </motion.div>
          )}

          {/* Card 0 — top (draggable) */}
          {card0 && (
            <motion.div
              key={card0.id}
              className="absolute inset-0"
              style={{ zIndex: 30 }}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            >
              <SongCard
                ref={topCardRef}
                track={card0}
                isTop={true}
                onLike={onLike}
                onPass={onPass}
                onDragUpdate={v => topX.set(v)} // live MotionValue sync
              />
            </motion.div>
          )}

        </div>
      </div>

      {/* Action buttons */}
      <ActionButtons
        onPass={handlePassButton}
        onLike={handleLikeButton}
        disabled={!card0}
      />
    </div>
  );
};

export default CardStack;