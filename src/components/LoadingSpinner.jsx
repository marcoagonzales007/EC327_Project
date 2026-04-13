import React from 'react';
import { motion } from 'framer-motion';

/**
 * Reusable spinner.
 * size: 'sm' | 'md' | 'lg'
 */
const LoadingSpinner = ({ size = 'md' }) => {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-[3px]',
  };

  return (
    <motion.div
      className={`
        ${sizeMap[size]}
        border-spotify-gray border-t-spotify-green
        rounded-full
      `}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.85, repeat: Infinity, ease: 'linear' }}
      role="status"
      aria-label="Loading"
    />
  );
};

export default LoadingSpinner;