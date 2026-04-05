import { useRef, useEffect, useCallback, useMemo } from 'react'
import { lookupCoverage } from '@/utils/coverageLookup'
import type {
  PolicyType,
  CoverageResult,
  CoverageStatus,
  Detection,
  BoundingBox,
} from '@/types'

/**
 * Color definitions for coverage status - State Farm branding
 */
interface ColorScheme {
  stroke: string
  fill: string
  text: string
  labelBg: string
}

interface ColorMap {
  green: ColorScheme
  red: ColorScheme
  yellow: ColorScheme
}

const COLORS: ColorMap = {
  green: {
    stroke: '#22c55e',
    fill: 'rgba(34, 197, 94, 0.15)',
    text: '#ffffff',
    labelBg: '#22c55e'
  },
  red: {
    stroke: '#E31837',
    fill: 'rgba(227, 24, 55, 0.15)',
    text: '#ffffff',
    labelBg: '#E31837'
  },
  yellow: {
    stroke: '#eab308',
    fill: 'rgba(234, 179, 8, 0.15)',
    text: '#000000',
    labelBg: '#eab308'
  }
}

/**
 * Status icons as Unicode characters
 */
const STATUS_ICONS: Record<CoverageStatus, string> = {
  covered: '✓',
  not_covered: '✕',
  conditional: '⚠'
}

/**
 * Status labels
 */
const STATUS_LABELS: Record<CoverageStatus, string> = {
  covered: 'Covered',
  not_covered: 'Not Covered',
  conditional: 'Conditional'
}

/**
 * Smoothing factor for exponential moving average (0-1)
 * Higher = more responsive but less smooth
 * Lower = smoother but more lag
 */
const SMOOTHING_FACTOR = 0.3

/**
 * Persistence threshold in milliseconds
 * Items stay visible for this long after disappearing
 */
const PERSISTENCE_THRESHOLD = 500

/**
 * Minimum confidence threshold for rendering
 */
const DEFAULT_CONFIDENCE_THRESHOLD = 0.5

/**
 * Format value as currency
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value)
}

/**
 * Layout result for object-fit cover calculations
 */
export interface ObjectCoverLayout {
  scale: number
  offsetX: number
  offsetY: number
}

/**
 * Canvas coordinate system
 */
export interface CanvasCoordinates {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Tracked item with coverage information
 */
interface TrackedItem {
  id: string
  name: string
  coordinates: CanvasCoordinates
  coverage: CoverageResult
  lastSeen: number
  score: number
}

/**
 * Clicked item data passed to onItemClick callback
 */
export interface ClickedItem {
  id: string
  category: string
  estimatedValue: number
  status: CoverageStatus
  source: 'camera'
}

/**
 * Props for CoverageOverlay component
 */
export interface CoverageOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  detections: Detection[]
  policyType: PolicyType
  confidenceThreshold?: number
  onItemClick?: (item: ClickedItem) => void
}

/**
 * Calculate object-fit cover layout
 */
export function getObjectCoverLayout(
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number
): ObjectCoverLayout {
  if (!videoWidth || !videoHeight || !containerWidth || !containerHeight) {
    return { scale: 1, offsetX: 0, offsetY: 0 }
  }

  const scale = Math.max(containerWidth / videoWidth, containerHeight / videoHeight)
  const renderedWidth = videoWidth * scale
  const renderedHeight = videoHeight * scale

  return {
    scale,
    offsetX: (containerWidth - renderedWidth) / 2,
    offsetY: (containerHeight - renderedHeight) / 2
  }
}

/**
 * Project bounding box coordinates to canvas space
 */
export function projectBoundingBoxToCanvas(
  box: BoundingBox,
  layout: ObjectCoverLayout
): CanvasCoordinates {
  return {
    x: (box.originX || 0) * layout.scale + layout.offsetX,
    y: (box.originY || 0) * layout.scale + layout.offsetY,
    width: (box.width || 0) * layout.scale,
    height: (box.height || 0) * layout.scale
  }
}

/**
 * CoverageOverlay component - Canvas-based overlay for camera feed
 *
 * Renders color-coded bounding boxes with coverage information:
 * - Green boxes for covered items
 * - Red boxes for uncovered items
 * - Yellow boxes for conditional items
 *
 * Features:
 * - Detection smoothing using exponential moving average
 * - Persistence threshold (items stay visible ~500ms after disappearing)
 * - Multi-object handling
 * - Overlapping boxes with semi-transparent fills
 * - Label repositioning for partial off-screen items
 * - Canvas resizing to match video dimensions
 * - Click handling to open detail modal
 */
export function CoverageOverlay({
  videoRef,
  detections,
  policyType,
  confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD,
  onItemClick
}: CoverageOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trackedItemsRef = useRef<Map<string, TrackedItem>>(new Map())
  const animationFrameRef = useRef<number | null>(null)

  /**
   * Get canvas context
   */
  const getContext = useCallback((): CanvasRenderingContext2D | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.getContext('2d')
  }, [])

  /**
   * Update canvas dimensions to match video
   */
  const updateCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current
    const video = videoRef?.current

    if (!canvas || !video) return

    // Match the displayed overlay area so canvas coordinates align with
    // the visible object-cover video frame.
    const width = Math.round(canvas.clientWidth || video.clientWidth || video.videoWidth || 640)
    const height = Math.round(canvas.clientHeight || video.clientHeight || video.videoHeight || 480)

    // Only update if dimensions changed
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
  }, [videoRef])

  /**
   * Apply exponential moving average smoothing to coordinates
   */
  const smoothCoordinates = useCallback((
    current: CanvasCoordinates,
    previous: CanvasCoordinates | undefined
  ): CanvasCoordinates => {
    if (!previous) return current

    return {
      x: previous.x + SMOOTHING_FACTOR * (current.x - previous.x),
      y: previous.y + SMOOTHING_FACTOR * (current.y - previous.y),
      width: previous.width + SMOOTHING_FACTOR * (current.width - previous.width),
      height: previous.height + SMOOTHING_FACTOR * (current.height - previous.height)
    }
  }, [])

  /**
   * Generate a unique ID for a detection based on category and rough position
   */
  const getDetectionId = useCallback((detection: Detection): string => {
    const category = detection.categories?.[0]?.categoryName || 'unknown'
    const box = detection.boundingBox || {}
    // Round position to nearest 50px grid to handle small movements
    const gridX = Math.round((box.originX || 0) / 50)
    const gridY = Math.round((box.originY || 0) / 50)
    return `${category}-${gridX}-${gridY}`
  }, [])

  /**
   * Draw a rounded rectangle
   */
  const drawRoundedRect = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    const r = Math.min(radius, width / 2, height / 2)
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + width - r, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + r)
    ctx.lineTo(x + width, y + height - r)
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
    ctx.lineTo(x + r, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }, [])

  /**
   * Draw a bounding box with label
   */
  const drawBoundingBox = useCallback((
    ctx: CanvasRenderingContext2D,
    item: TrackedItem,
    colorScheme: CoverageResult
  ) => {
    const { x, y, width, height } = item.coordinates
    const colors = COLORS[colorScheme.color] || COLORS.red

    // Box padding for stroke
    const strokeWidth = 3
    const padding = strokeWidth / 2

    // Draw semi-transparent fill
    ctx.fillStyle = colors.fill
    ctx.fillRect(x, y, width, height)

    // Draw border
    ctx.strokeStyle = colors.stroke
    ctx.lineWidth = strokeWidth
    ctx.strokeRect(x + padding, y + padding, width - strokeWidth, height - strokeWidth)

    // Prepare label text
    const icon = STATUS_ICONS[colorScheme.status] || '✕'
    const label = STATUS_LABELS[colorScheme.status] || 'Unknown'
    const value = formatCurrency(colorScheme.estimatedValue)
    const name = item.name.charAt(0).toUpperCase() + item.name.slice(1)

    const line1 = `${icon} ${name}`
    const line2 = `${value} • ${label}`

    // Calculate label dimensions
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif'
    const line1Width = ctx.measureText(line1).width
    ctx.font = '12px system-ui, -apple-system, sans-serif'
    const line2Width = ctx.measureText(line2).width

    const labelWidth = Math.max(line1Width, line2Width) + 16
    const lineHeight = 18
    const labelHeight = lineHeight * 2 + 8
    const cornerRadius = 4

    // Determine label position (above box by default)
    let labelX = x
    let labelY = y - labelHeight - 4

    // Reposition if too close to top edge
    if (labelY < 10) {
      labelY = y + height + 4
    }

    // Reposition if too close to right edge
    const canvasWidth = ctx.canvas.width
    if (labelX + labelWidth > canvasWidth - 10) {
      labelX = canvasWidth - labelWidth - 10
    }

    // Ensure label doesn't go off left edge
    if (labelX < 10) {
      labelX = 10
    }

    // Draw label background with rounded corners
    ctx.fillStyle = colors.labelBg
    drawRoundedRect(ctx, labelX, labelY, labelWidth, labelHeight, cornerRadius)
    ctx.fill()

    // Draw label text
    ctx.fillStyle = colors.text
    ctx.textBaseline = 'top'

    // First line (icon + name)
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif'
    ctx.fillText(line1, labelX + 8, labelY + 6)

    // Second line (value + status)
    ctx.font = '12px system-ui, -apple-system, sans-serif'
    ctx.fillText(line2, labelX + 8, labelY + 6 + lineHeight)
  }, [drawRoundedRect])

  /**
   * Process detections and update tracked items
   */
  const processDetections = useCallback((layout: ObjectCoverLayout): Map<string, TrackedItem> => {
    const now = Date.now()
    const currentIds = new Set<string>()

    // Filter detections by confidence threshold AND exclude person class
    const validDetections = (detections || []).filter(d => {
      const score = d.categories?.[0]?.score || 0
      const category = d.categories?.[0]?.categoryName || 'unknown'
      
      // Skip person detections (humans are not insurable property)
      if (category === 'person') return false
      
      return score >= confidenceThreshold
    })

    // Process current detections
    validDetections.forEach(detection => {
      const id = getDetectionId(detection)
      currentIds.add(id)

      const category = detection.categories?.[0]?.categoryName || 'unknown'
      const box = detection.boundingBox || {}

      const currentCoords = projectBoundingBoxToCanvas(box, layout)

      const existing = trackedItemsRef.current.get(id)
      const smoothedCoords = smoothCoordinates(currentCoords, existing?.coordinates)

      // Look up coverage for this item
      const coverage = lookupCoverage(category, policyType)

      trackedItemsRef.current.set(id, {
        id,
        name: category,
        coordinates: smoothedCoords,
        coverage,
        lastSeen: now,
        score: detection.categories?.[0]?.score || 0
      })
    })

    // Remove items that haven't been seen for longer than threshold
    trackedItemsRef.current.forEach((item, id) => {
      if (!currentIds.has(id) && now - item.lastSeen > PERSISTENCE_THRESHOLD) {
        trackedItemsRef.current.delete(id)
      }
    })

    return trackedItemsRef.current
  }, [detections, policyType, confidenceThreshold, getDetectionId, smoothCoordinates])

  /**
   * Render the overlay
   */
  const render = useCallback(() => {
    const ctx = getContext()
    if (!ctx) return

    const canvas = canvasRef.current
    const video = videoRef?.current

    if (!canvas) return

    // Update canvas dimensions
    updateCanvasDimensions()

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // If no video or video not ready, don't render detections
    if (!video || video.readyState < 2) return

    const layout = getObjectCoverLayout(
      video.videoWidth || canvas.width,
      video.videoHeight || canvas.height,
      canvas.width,
      canvas.height
    )

    // Process detections and get tracked items
    const items = processDetections(layout)

    // Draw each tracked item
    items.forEach(item => {
      drawBoundingBox(ctx, item, item.coverage)
    })
  }, [getContext, videoRef, updateCanvasDimensions, processDetections, drawBoundingBox])

  /**
   * Animation loop
   */
  const animate = useCallback(() => {
    render()
    animationFrameRef.current = requestAnimationFrame(animate)
  }, [render])

  /**
   * Handle canvas click to detect which item was clicked
   */
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onItemClick) return

    const canvas = canvasRef.current
    if (!canvas) return

    // Get click coordinates relative to canvas
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const clickX = (event.clientX - rect.left) * scaleX
    const clickY = (event.clientY - rect.top) * scaleY

    // Check which item was clicked (iterate in reverse to click top items first)
    const items = Array.from(trackedItemsRef.current.values()).reverse()

    for (const item of items) {
      const { x, y, width, height } = item.coordinates

      // Check if click is within bounding box (with some padding for easier clicking)
      const padding = 10
      if (
        clickX >= x - padding &&
        clickX <= x + width + padding &&
        clickY >= y - padding &&
        clickY <= y + height + padding
      ) {
        // Call the onItemClick callback with the clicked item
        onItemClick({
          id: item.id,
          category: item.name,
          estimatedValue: item.coverage.estimatedValue,
          status: item.coverage.status,
          source: 'camera'
        })
        break
      }
    }
  }, [onItemClick])

  // Start/stop animation loop
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [animate])

  // Clear tracked items when policy changes
  useEffect(() => {
    trackedItemsRef.current.clear()
  }, [policyType])

  // Memoize canvas style
  const canvasStyle = useMemo(() => ({
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: onItemClick ? 'auto' as const : 'none' as const,
    cursor: onItemClick ? 'pointer' as const : 'default' as const
  }), [onItemClick])

  return (
    <canvas
      ref={canvasRef}
      data-testid="coverage-overlay"
      style={canvasStyle}
      className="absolute inset-0 w-full h-full"
      onClick={handleCanvasClick}
    />
  )
}

export default CoverageOverlay
