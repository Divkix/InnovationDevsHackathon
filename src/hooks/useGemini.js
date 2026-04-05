/**
 * useGemini hook - Gemini API integration placeholder
 * 
 * This hook provides a placeholder for Gemini AI integration.
 * When VITE_GEMINI_API_KEY is set, it returns a configured client.
 * When the key is empty/missing, it returns null.
 * 
 * This allows the UI to conditionally show "Ask about coverage" features
 * only when the API key is configured.
 * 
 * @returns {Object|null} Gemini client configuration or null if no API key
 */
export function useGemini() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY

  // Return null if no API key is configured
  if (!apiKey || apiKey.trim() === '') {
    return null
  }

  // Return a minimal client configuration object
  // In a real implementation, this would initialize the Gemini SDK
  return {
    apiKey,
    isConfigured: true,
    // Placeholder for future chat functionality
    askAboutCoverage: async (item, policyType) => {
      // This would make an actual API call to Gemini
      console.log(`[Gemini Placeholder] Asking about ${item} under ${policyType}`)
      return null
    }
  }
}

export default useGemini
