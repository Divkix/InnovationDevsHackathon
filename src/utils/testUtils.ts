/**
 * Test environment detection utility
 * 
 * Provides a way to detect if code is running in a test environment
 * and adjust behavior accordingly (e.g., disable animations)
 */

import type { AnimationProps, TestGlobals } from '../types';

// Extend Window interface to include test globals
declare global {
  interface Window extends TestGlobals {}
}

/**
 * Check if running in a test environment
 * @returns True if in test environment, false otherwise
 */
export function isTestEnvironment(): boolean {
  return (
    typeof process !== 'undefined' && 
    (process.env.NODE_ENV === 'test' || process.env.VITEST !== undefined)
  ) || (
    typeof window !== 'undefined' && 
    window.__TESTING__ === true
  );
}

/**
 * Get animation props based on environment
 * Returns props that disable animations in test environment
 * @param animationProps - The animation props to use in non-test environment
 * @returns Props for motion components
 */
export function getAnimationProps(animationProps: AnimationProps = {}): AnimationProps {
  if (isTestEnvironment()) {
    // In test environment, disable initial animations
    return {
      initial: false,
      animate: animationProps.animate || {},
      exit: animationProps.exit || {},
      transition: { duration: 0 }
    };
  }
  return animationProps;
}

/**
 * Motion component props for test compatibility
 * Use this to spread props onto motion components
 */
export const testSafeMotion: AnimationProps = {
  initial: typeof process !== 'undefined' && process.env.NODE_ENV === 'test' ? false : undefined
};
