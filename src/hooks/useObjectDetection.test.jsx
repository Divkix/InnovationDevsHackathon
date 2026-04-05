import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useObjectDetection } from './useObjectDetection.js'

// Mock the YOLO detection hook
vi.mock('./useYOLODetection.js', () => ({
  useYOLODetection: vi.fn()
}))

import { useYOLODetection } from './useYOLODetection.js'

describe('useObjectDetection (YOLO26 compatibility layer)', () => {
  it('delegates to useYOLODetection', () => {
    const mockReturn = {
      detect: vi.fn(),
      isLoaded: true,
      error: null,
      isMockMode: false
    }
    
    useYOLODetection.mockReturnValue(mockReturn)
    
    const { result } = renderHook(() => useObjectDetection())
    
    expect(useYOLODetection).toHaveBeenCalled()
    expect(result.current).toEqual(mockReturn)
  })

  it('maintains backward-compatible API', () => {
    const mockReturn = {
      detect: vi.fn(),
      isLoaded: true,
      error: null,
      isMockMode: false
    }
    
    useYOLODetection.mockReturnValue(mockReturn)
    
    const { result } = renderHook(() => useObjectDetection())
    
    // Verify the hook returns expected shape
    expect(result.current).toHaveProperty('detect')
    expect(result.current).toHaveProperty('isLoaded')
    expect(result.current).toHaveProperty('error')
    expect(result.current).toHaveProperty('isMockMode')
    
    // Verify types match expected API
    expect(typeof result.current.detect).toBe('function')
    expect(typeof result.current.isLoaded).toBe('boolean')
    expect(typeof result.current.isMockMode).toBe('boolean')
  })
})
