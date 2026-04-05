import { useState, useRef, useEffect, useCallback } from 'react'
import { useAppContext } from '../../context/AppContext.jsx'
import { useObjectDetection } from '../../hooks/useObjectDetection.js'
import { CoverageOverlay } from '../CoverageOverlay/CoverageOverlay.jsx'
import { Loader2, Camera, AlertCircle, RefreshCw, Hand } from 'lucide-react'

/**
 * CameraView component - Main camera component for InsureScope
 * 
 * Features:
 * - Requests camera via getUserMedia with facingMode 'environment' (mobile) or 'user' (desktop)
 * - Displays video feed with CoverageOverlay for detection visualization
 * - Integrates useObjectDetection hook for object detection
 * - Shows loading spinner during model initialization
 * - Shows error states for camera permission denial, unsupported browser, or model loading failure
 * - Stops camera tracks on unmount
 * - Runs detection loop via requestAnimationFrame
 * - Displays current policy type indicator badge
 * - Passes detections to CoverageOverlay for color-coded bounding box rendering
 * 
 * @param {Object} props
 * @param {Function} props.onError - Callback when an error occurs
 * @param {Function} props.onManualMode - Callback when user selects manual mode
 * @returns {JSX.Element}
 */
export function CameraView({ onError, onManualMode }) {
  const { policyType, updateDetectedItems } = useAppContext()
  const { detect, isLoaded, error: modelError } = useObjectDetection()
  
  // Refs for video and canvas elements
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const animationFrameRef = useRef(null)
  
  // State for camera, errors, and detections
  const [cameraError, setCameraError] = useState(null)
  const [isRequestingCamera, setIsRequestingCamera] = useState(false)
  const [detections, setDetections] = useState([])
  
  /**
   * Detect if device is mobile
   */
  const isMobile = useCallback(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())
  }, [])
  
  /**
   * Request camera access with appropriate facing mode
   */
  const requestCamera = useCallback(async () => {
    setIsRequestingCamera(true)
    setCameraError(null)
    
    try {
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser not supported')
      }
      
      // Determine facing mode based on device type
      const facingMode = isMobile() ? 'environment' : 'user'
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      })
      
      // Store stream reference for cleanup
      streamRef.current = stream
      
      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      let errorMessage = 'Camera access failed'
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Camera access denied'
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found'
      } else if (err.message === 'Browser not supported') {
        errorMessage = 'Browser not supported'
      } else {
        errorMessage = err.message || 'Camera error'
      }
      
      const error = new Error(errorMessage)
      setCameraError(error)
      if (onError) onError(error)
    } finally {
      setIsRequestingCamera(false)
    }
  }, [isMobile, onError])
  
  /**
   * Stop all camera tracks
   */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
      })
      streamRef.current = null
    }
  }, [])
  
  /**
   * Handle retry button click
   */
  const handleRetry = useCallback(() => {
    if (modelError) {
      // Reload the page to reinitialize the model
      window.location.reload()
    } else {
      requestCamera()
    }
  }, [modelError, requestCamera])
  
  /**
   * Handle manual mode button click
   */
  const handleManualMode = useCallback(() => {
    if (onManualMode) {
      onManualMode()
    }
  }, [onManualMode])
  
  /**
   * Detection loop using requestAnimationFrame
   */
  const detectionLoop = useCallback(async (timestamp) => {
    if (!videoRef.current) return
    
    // Run detection if video is playing and model is loaded
    if (videoRef.current.readyState >= 2 && isLoaded) {
      const results = await detect(videoRef.current, timestamp)
      
      // Update detections for CoverageOverlay
      setDetections(results.detections || [])
      
      // Update detected items in context
      if (results.detections && results.detections.length > 0) {
        const itemsMap = new Map()
        results.detections.forEach((detection, index) => {
          const category = detection.categories?.[0]?.categoryName || 'unknown'
          itemsMap.set(`detection-${index}`, {
            id: `detection-${index}`,
            name: category,
            boundingBox: detection.boundingBox,
            score: detection.categories?.[0]?.score || 0,
            category: category
          })
        })
        updateDetectedItems(itemsMap)
      }
    }
    
    // Schedule next frame
    animationFrameRef.current = requestAnimationFrame(detectionLoop)
  }, [detect, isLoaded, updateDetectedItems])
  
  /**
   * Get policy display name and color
   */
  const getPolicyInfo = useCallback(() => {
    const policyMap = {
      renters: { name: "Renter's Insurance", color: 'bg-blue-600', textColor: 'text-blue-100' },
      homeowners: { name: "Homeowner's Insurance", color: 'bg-purple-600', textColor: 'text-purple-100' },
      auto: { name: 'Auto Insurance', color: 'bg-green-600', textColor: 'text-green-100' },
      none: { name: 'No Insurance', color: 'bg-red-600', textColor: 'text-red-100' }
    }
    return policyMap[policyType] || policyMap.renters
  }, [policyType])
  
  // Request camera on mount
  useEffect(() => {
    requestCamera()
    
    // Cleanup on unmount
    return () => {
      stopCamera()
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])
  
  // Start detection loop when video is ready and model is loaded
  useEffect(() => {
    if (isLoaded && !cameraError && !modelError) {
      animationFrameRef.current = requestAnimationFrame(detectionLoop)
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isLoaded, cameraError, modelError, detectionLoop])
  
  // Report model errors
  useEffect(() => {
    if (modelError && onError) {
      onError(modelError)
    }
  }, [modelError, onError])
  
  // Determine current error state
  const currentError = modelError || cameraError
  const isLoadingModel = !isLoaded && !modelError
  const isCameraPermissionError = cameraError?.message?.includes('denied')
  const isBrowserUnsupported = cameraError?.message?.includes('Browser not supported')
  const isModelError = !!modelError
  
  const policyInfo = getPolicyInfo()
  
  // Loading state
  if (isLoadingModel) {
    return (
      <div
        data-testid="camera-loading"
        className="flex flex-col items-center justify-center h-full min-h-[300px] bg-gray-900 rounded-lg"
      >
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-white text-lg font-medium">Loading AI Model...</p>
        <p className="text-gray-400 text-sm mt-2">Please wait while we initialize the object detector</p>
      </div>
    )
  }
  
  // Error state
  if (currentError) {
    return (
      <div
        data-testid="camera-error"
        className="flex flex-col items-center justify-center h-full min-h-[300px] bg-gray-900 rounded-lg p-6"
      >
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-white text-lg font-medium mb-2">
          {isModelError ? 'Model Failed to Load' : 'Camera Error'}
        </p>
        <p className="text-gray-400 text-sm text-center mb-6 max-w-md">
          {currentError.message}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            data-testid="retry-button"
            onClick={handleRetry}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {isModelError ? 'Reload Page' : 'Retry'}
          </button>
          
          {(isCameraPermissionError || isBrowserUnsupported) && (
            <button
              data-testid="manual-mode-button"
              onClick={handleManualMode}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              <Hand className="w-4 h-4" />
              Use Manual Mode
            </button>
          )}
        </div>
      </div>
    )
  }
  
  // Camera view state
  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      {/* Policy type badge */}
      <div
        data-testid="policy-badge"
        className={`absolute top-4 left-4 z-20 px-3 py-1.5 ${policyInfo.color} rounded-full shadow-lg`}
      >
        <span className={`text-xs font-semibold ${policyInfo.textColor}`}>
          {policyInfo.name}
        </span>
      </div>
      
      {/* Video element */}
      <video
        ref={videoRef}
        data-testid="camera-video"
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      
      {/* Coverage overlay for rendering bounding boxes */}
      <CoverageOverlay
        videoRef={videoRef}
        detections={detections}
        policyType={policyType}
      />
      
      {/* Camera requesting indicator */}
      {isRequestingCamera && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 z-10">
          <Camera className="w-10 h-10 text-blue-500 mb-3" />
          <p className="text-white font-medium">Requesting camera access...</p>
        </div>
      )}
    </div>
  )
}
