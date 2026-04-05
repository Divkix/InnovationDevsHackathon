/**
 * Test environment detection utility
 * 
 * Provides a way to detect if code is running in a test environment
 * and adjust behavior accordingly (e.g., disable animations)
 */

/**
 * Check if running in a test environment
 * @returns {boolean}
 */
export function isTestEnvironment() {
  return (
    typeof process !== 'undefined' && 
    (process.env.NODE_ENV === 'test' || process.env.VITEST)
  ) || (
    typeof window !== 'undefined' && 
    window.__TESTING__ === true
  )
}

/**
 * Get animation props based on environment
 * Returns props that disable animations in test environment
 * @param {Object} animationProps - The animation props to use in non-test environment
 * @returns {Object} Props for motion components
 */
export function getAnimationProps(animationProps = {}) {
  if (isTestEnvironment()) {
    // In test environment, disable initial animations
    return {
      initial: false,
      animate: animationProps.animate || {},
      exit: animationProps.exit || {},
      transition: { duration: 0 }
    }
  }
  return animationProps
}

/**
 * Motion component props for test compatibility
 * Use this to spread props onto motion components
 */
export const testSafeMotion = {
  initial: typeof process !== 'undefined' && process.env.NODE_ENV === 'test' ? false : undefined
}
