import React, {
  useState,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  motion,
  useAnimation,
  useMotionValue,
  useTransform,
} from 'framer-motion';

// How far (px) or how fast (px/s) the user must drag to trigger a swipe
const SWIPE_THRESHOLD = 100;
const SWIPE_VELOCITY = 600;
const ROTATE_FACTOR = 20; // max card tilt in degrees while dragging

/**
 * SongCard — one card in the deck.
 *
 * Props:
 *   track        — track object (placeholder or real Spotify shape)
 *   isTop        — only the top card is draggable / plays audio
 *   onLike       — called with (track) after a successful right swipe
 *   onPass       — called with (track) after a successful left swipe
 *   onDragUpdate — called every frame with the current x offset so the
 *                  CardStack can animate background cards in sync
 *
 * Ref methods (used by ActionButtons in later checkpoints):
 *   triggerLike() — programmatically fires the right-swipe animation
 *   triggerPass() — programmatically fires the left-swipe animation
 */
const SongCard = forwardRef(({
  track,
  isTop,
  onLike,
  onPass,
  onDragUpdate,
}, ref) => {

  // ─── Animation controls ────────────────────────────────────────────────────
  const controls = useAnimation();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-ROTATE_FACTOR, 0, ROTATE_FACTOR]);

  // These drive the LIKE / PASS stamp opacity as the card is dragged
  const likeOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1]);
  const passOpacity = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0]);

  // ─── Audio state (wired up in Checkpoint 3 when preview_url is real) ──────
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const toggleAudio = useCallback((e) => {
    e.stopPropagation(); // Don't accidentally start a drag from the button
    if (!track?.preview_url || !audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => { });
      setIsPlaying(true);
    }
  }, [isPlaying, track?.preview_url]);

  // ─── Programmatic swipe (exposed via ref for ActionButtons) ───────────────
  const triggerLike = useCallback(async () => {
    if (onDragUpdate) onDragUpdate(0);
    await controls.start({
      x: window.innerWidth + 300,
      y: -60,
      rotate: 22,
      opacity: 0,
      transition: { duration: 0.38, ease: [0.32, 0, 0.67, 0] },
    });
    onLike(track);
  }, [controls, onLike, onDragUpdate, track]);

  const triggerPass = useCallback(async () => {
    if (onDragUpdate) onDragUpdate(0);
    await controls.start({
      x: -(window.innerWidth + 300),
      y: -60,
      rotate: -22,
      opacity: 0,
      transition: { duration: 0.38, ease: [0.32, 0, 0.67, 0] },
    });
    onPass(track);
  }, [controls, onPass, onDragUpdate, track]);

  useImperativeHandle(ref, () => ({ triggerLike, triggerPass }), [
    triggerLike,
    triggerPass,
  ]);

  // ─── Drag handlers ────────────────────────────────────────────────────────
  const handleDrag = useCallback((_, info) => {
    onDragUpdate?.(info.offset.x);
  }, [onDragUpdate]);

  const handleDragEnd = useCallback(async (_, { offset, velocity }) => {
    onDragUpdate?.(0);

    const swipedRight = offset.x > SWIPE_THRESHOLD || velocity.x > SWIPE_VELOCITY;
    const swipedLeft = offset.x < -SWIPE_THRESHOLD || velocity.x < -SWIPE_VELOCITY;

    if (swipedRight) {
      await controls.start({
        x: window.innerWidth + 300,
        opacity: 0,
        transition: { duration: 0.28 },
      });
      onLike(track);
    } else if (swipedLeft) {
      await controls.start({
        x: -(window.innerWidth + 300),
        opacity: 0,
        transition: { duration: 0.28 },
      });
      onPass(track);
    } else {
      // Not far/fast enough — spring the card back to center
      controls.start({
        x: 0, y: 0, rotate: 0,
        transition: { type: 'spring', stiffness: 450, damping: 28 },
      });
    }
  }, [controls, onLike, onPass, track, onDragUpdate]);

  // ─── Derived data ─────────────────────────────────────────────────────────
  const albumArt = track?.album?.images?.[0]?.url;
  const artistNames = track?.artists?.map(a => a.name).join(', ') ?? '';
  const albumName = track?.album?.name ?? '';
  const popularity = track?.popularity;
  const hasPreview = Boolean(track?.preview_url);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <motion.div
      className={`absolute inset-0 no-select ${isTop ? 'touch-none' : ''}`}
      style={{ x, y, rotate, zIndex: isTop ? 1 : 0 }}
      animate={controls}
      /* Only the top card is draggable */
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.85}
      dragMomentum={false}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      whileDrag={{ cursor: 'grabbing' }}
    >
      {/* ── Card Shell ─────────────────────────────────────────────────────── */}
      <div className="w-full h-full rounded-3xl overflow-hidden relative shadow-card border border-white/[0.06]">

        {/* Album art / placeholder background */}
        {albumArt ? (
          <img
            src={albumArt}
            alt={`${track?.name} album art`}
            className="absolute inset-0 w-full h-full object-cover object-center"
            draggable={false}
          />
        ) : (
          /* Gradient fallback when there is no image */
          <div className="absolute inset-0 bg-gradient-to-br from-gray-700 via-gray-800 to-zinc-900 flex items-center justify-center">
            <MusicNoteIcon className="w-24 h-24 text-gray-600" />
          </div>
        )}

        {/* Cinematic gradient so text is readable over any album art */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent via-40% to-black/95" />

        {/* ── LIKE stamp (fades in on drag-right) ──────────────────────────── */}
        <motion.div
          className="absolute top-9 left-5 z-20 pointer-events-none"
          style={{ opacity: likeOpacity, rotate: -18 }}
        >
          <div className="border-[3px] border-spotify-green rounded-xl px-4 py-1">
            <span className="text-spotify-green font-black text-3xl tracking-[0.12em]">
              LIKE
            </span>
          </div>
        </motion.div>

        {/* ── PASS stamp (fades in on drag-left) ───────────────────────────── */}
        <motion.div
          className="absolute top-9 right-5 z-20 pointer-events-none"
          style={{ opacity: passOpacity, rotate: 18 }}
        >
          <div className="border-[3px] border-red-500 rounded-xl px-4 py-1">
            <span className="text-red-500 font-black text-3xl tracking-[0.12em]">
              PASS
            </span>
          </div>
        </motion.div>

        {/* ── Bottom info panel (glassmorphism) ────────────────────────────── */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <div className="glass-dark rounded-2xl p-4">

            <div className="flex items-start gap-3">
              {/* Track text */}
              <div className="flex-1 min-w-0">
                <h2 className="text-white font-bold text-xl leading-snug truncate">
                  {track?.name}
                </h2>
                <p className="text-gray-300 text-sm mt-0.5 truncate">
                  {artistNames}
                </p>
                <p className="text-gray-500 text-xs mt-0.5 truncate">
                  {albumName}
                </p>
              </div>

              {/* Play / Pause button — wired to audio in Checkpoint 3 */}
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={toggleAudio}
                disabled={!hasPreview}
                className={`
                  flex-shrink-0 w-12 h-12 rounded-full
                  flex items-center justify-center
                  transition-all duration-150 active:scale-90
                  ${hasPreview
                    ? 'bg-spotify-green shadow-green-glow hover:bg-green-400'
                    : 'bg-spotify-gray opacity-40 cursor-not-allowed'}
                `}
                title={hasPreview ? 'Toggle preview' : 'No preview available'}
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </button>
            </div>

            {/* Animated audio visualizer bars — visible while preview plays */}
            {isPlaying && (
              <div className="flex items-end gap-1 mt-2 h-5">
                {['bar-1', 'bar-2', 'bar-3', 'bar-4'].map(cls => (
                  <div
                    key={cls}
                    className={`w-1 bg-spotify-green rounded-full animate-${cls}`}
                    style={{ height: '4px' }}
                  />
                ))}
                <span className="text-gray-500 text-[10px] ml-1 self-center">
                  Preview playing
                </span>
              </div>
            )}

            {/* Popularity bar */}
            {popularity !== undefined && (
              <div className="flex items-center gap-2 mt-3">
                <span className="text-gray-600 text-[11px] w-16 flex-shrink-0">
                  Popularity
                </span>
                <div className="flex-1 bg-gray-700/60 rounded-full h-1 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-spotify-green to-emerald-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${popularity}%` }}
                    transition={{ delay: 0.4, duration: 0.9, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-gray-600 text-[11px] w-6 text-right">
                  {popularity}
                </span>
              </div>
            )}

            {/* No preview notice */}
            {!hasPreview && (
              <p className="text-gray-600 text-[11px] mt-2 flex items-center gap-1">
                <InfoIcon className="w-3 h-3 flex-shrink-0" />
                No audio preview for this track
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Hidden audio element — src will be a real URL in Checkpoint 3 */}
      {hasPreview && (
        <audio
          ref={audioRef}
          src={track.preview_url}
          onEnded={() => setIsPlaying(false)}
          preload="none"
        />
      )}
    </motion.div>
  );
});

SongCard.displayName = 'SongCard';
export default SongCard;

// ─── Small inline SVG icons ────────────────────────────────────────────────────
const PlayIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-black ml-0.5" aria-hidden>
    <path d="M8 5v14l11-7z" />
  </svg>
);
const PauseIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-black" aria-hidden>
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);
const MusicNoteIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
  </svg>
);
const InfoIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
  </svg>
);