import React from 'react';
import { motion } from 'framer-motion';

/**
 * Shown when the user has swiped through every card in the deck.
 * onReset → rebuilds the deck (will call the API in later checkpoints)
 */
const EmptyState = ({ onReset }) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 text-center">

    <motion.div
      className="text-6xl"
      animate={{ scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }}
      transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
    >
      🎵
    </motion.div>

    <div>
      <h2 className="text-white font-bold text-2xl mb-2">
        You've heard it all!
      </h2>
      <p className="text-spotify-light-gray text-sm leading-relaxed">
        You swiped through the whole deck.
        <br />
        Want to go again?
      </p>
    </div>

    <motion.button
      onClick={onReset}
      className="
        px-8 py-3.5 rounded-full
        bg-[#1DB954] text-black font-bold text-sm
        shadow-lg hover:bg-[#1ed760]
        transition-all duration-150
      "
      
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
    >
      Shuffle Again
    </motion.button>
  </div>
);

export default EmptyState;