/**
 * Animation Utilities
 * Provides comprehensive animation functions for manga reading experience
 * Includes panel transitions, character animations, text effects, and more
 */

import { motion } from 'framer-motion';

/**
 * Panel entrance animations
 */
export const panelAnimations = {
  // Fade in
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 }
  },

  // Slide in from left (for LTR reading)
  slideInLeft: {
    initial: { opacity: 0, x: -50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
    transition: { duration: 0.4 }
  },

  // Slide in from right (for RTL reading)
  slideInRight: {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 50 },
    transition: { duration: 0.4 }
  },

  // Zoom in (dramatic focus)
  zoomIn: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: { duration: 0.5 }
  },

  // Reveal (like panel wipe)
  reveal: {
    initial: { clipPath: 'inset(0% 100% 0% 0%)' },
    animate: { clipPath: 'inset(0% 0% 0% 0%)' },
    exit: { clipPath: 'inset(0% 100% 0% 0%)' },
    transition: { duration: 0.6 }
  }
};

/**
 * Text animations for dialogue and narration
 */
export const textAnimations = {
  // Typewriter effect
  typewriter: (charCount = 0) => ({
    initial: { width: 0 },
    animate: { width: '100%' },
    transition: { duration: charCount * 0.03, ease: 'linear' }
  }),

  // Fade in words sequentially
  wordFadeIn: (wordCount = 0) => ({
    initial: 'hidden',
    animate: 'visible',
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3
    }
  }),

  // Fade in with emphasis
  emphasis: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.4, ease: 'easeOut' }
  },

  // Bounce entrance
  bounce: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    transition: { 
      type: 'spring', 
      stiffness: 300, 
      damping: 20 
    }
  }
};

/**
 * Speech bubble animations
 */
export const bubbleAnimations = {
  // Pop appearance
  pop: {
    initial: { opacity: 0, scale: 0 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0 },
    transition: { type: 'spring', stiffness: 400, damping: 15 }
  },

  // Slide in from speaker character
  slideFromCharacter: (fromX, fromY) => ({
    initial: { opacity: 0, x: fromX, y: fromY },
    animate: { opacity: 1, x: 0, y: 0 },
    transition: { duration: 0.3 }
  }),

  // Gentle pulse for emphasis
  pulse: {
    animate: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 0.5,
        repeat: Infinity,
        repeatDelay: 2
      }
    }
  }
};

/**
 * Character animations
 */
export const characterAnimations = {
  // Character entrance
  enter: {
    initial: { opacity: 0, x: -100 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.5 }
  },

  // Character exit
  exit: {
    animate: { opacity: 0, x: 100 },
    transition: { duration: 0.4 }
  },

  // Reaction (shake)
  reaction: {
    animate: {
      x: [-5, 5, -5, 5, 0],
      transition: { duration: 0.3 }
    }
  },

  // Emotion change (color shift)
  emotionShift: (fromColor, toColor) => ({
    animate: { backgroundColor: [fromColor, toColor] },
    transition: { duration: 0.6 }
  }),

  // Breathing effect
  breathing: {
    animate: {
      scale: [1, 1.02, 1],
      transition: {
        duration: 2,
        repeat: Infinity
      }
    }
  }
};

/**
 * Scene/background animations
 */
export const sceneAnimations = {
  // Zoom effect
  zoom: (direction = 'in') => ({
    animate: {
      scale: direction === 'in' ? [1, 1.1] : [1.1, 1]
    },
    transition: { duration: 0.8 }
  }),

  // Fade darkness (emphasis effect)
  darkness: {
    animate: {
      backgroundColor: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0)']
    },
    transition: { duration: 1 }
  },

  // Motion blur (action effect)
  motionBlur: {
    animate: {
      filter: ['blur(0px)', 'blur(2px)', 'blur(0px)']
    },
    transition: { duration: 0.4 }
  }
};

/**
 * Page transition animations
 */
export const pageTransitions = {
  // Page flip (vertical)
  flip: {
    initial: { rotateX: 90, opacity: 0 },
    animate: { rotateX: 0, opacity: 1 },
    exit: { rotateX: -90, opacity: 0 },
    transition: { duration: 0.6 }
  },

  // Curtain swipe
  curtain: (direction = 'left') => ({
    initial: { 
      clipPath: direction === 'left' 
        ? 'inset(0 100% 0 0)' 
        : 'inset(0 0 0 100%)' 
    },
    animate: { clipPath: 'inset(0 0 0 0)' },
    exit: { 
      clipPath: direction === 'left' 
        ? 'inset(0 0 0 100%)' 
        : 'inset(0 100% 0 0)' 
    },
    transition: { duration: 0.5 }
  }),

  // Cross dissolve
  dissolve: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.4 }
  }
};

/**
 * Utility function: sequence animations
 */
export function sequenceAnimations(animations, startDelay = 0) {
  const delays = [];
  let currentDelay = startDelay;

  for (const anim of animations) {
    delays.push(currentDelay);
    currentDelay += (anim.transition?.duration || 0.3) + (anim.transition?.delay || 0);
  }

  return { delays, totalDuration: currentDelay };
}

/**
 * Utility function: create stagger animation
 */
export function createStaggerAnimation(itemCount, staggerDelay = 0.1) {
  return {
    container: {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: {
          staggerChildren: staggerDelay
        }
      }
    },
    item: {
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0 }
    }
  };
}

/**
 * Get animation variant based on emotion intensity
 */
export function getEmotionAnimation(intensity = 0.5) {
  // intensity: 0 (calm) to 1 (dramatic)
  const duration = 0.3 + (intensity * 0.5); // 0.3 to 0.8
  const scale = 0.95 + (intensity * 0.2); // 0.95 to 1.15
  
  return {
    initial: { scale: 1, opacity: 0 },
    animate: { scale, opacity: 1 },
    transition: { duration }
  };
}

export default {
  panelAnimations,
  textAnimations,
  bubbleAnimations,
  characterAnimations,
  sceneAnimations,
  pageTransitions,
  sequenceAnimations,
  createStaggerAnimation,
  getEmotionAnimation
};
