import { useState, useCallback } from 'react'
import { X, Plus, Edit2, Trash2, Gem, Music, Palette, Camera, Gamepad2, Wrench, Dumbbell, Target, UtensilsCrossed, Briefcase } from 'lucide-react'
import { useAppContext } from '@/context/AppContext.jsx'
import { lookupCoverage } from '@/utils/coverageLookup.js'

/**
 * Manual item categories with icons
 * Insurance-relevant categories not typically detected by COCO-SSD
 */
const MANUAL_CATEGORIES = [
  { id: 'jewelry', label: 'Jewelry & Watches', icon: Gem, description: 'Rings, necklaces, watches, precious metals' },
  { id: 'musical_instruments', label: 'Musical Instruments', icon: Music, description: 'Guitars, pianos, violins, drums' },
  { id: 'art_collectibles', label: 'Art & Collectibles', icon: Palette, description: 'Paintings, sculptures, memorabilia' },
  { id: 'cameras', label: 'Cameras & Equipment', icon: Camera, description: 'DSLRs, lenses, tripods, lighting' },
  { id: 'gaming_equipment', label: 'Gaming Equipment', icon: Gamepad2, description: 'Consoles, high-end PCs, accessories' },
  { id: 'power_tools', label: 'Power Tools', icon: Wrench, description: 'Drills, saws, lawn equipment' },
  { id: 'exercise_equipment', label: 'Exercise Equipment', icon: Dumbbell, description: 'Treadmills, weights, bikes' },
  { id: 'firearms', label: 'Firearms', icon: Target, description: 'Guns, hunting equipment (requires special coverage)' },
  { id: 'silverware', label: 'Silverware & China', icon: UtensilsCrossed, description: 'Fine dining sets, heirloom silver' },
  { id: 'furs', label: 'Furs & Luxury Items', icon: Briefcase, description: 'Fur coats, designer handbags' },
  { id: 'other', label: 'Other Valuables', icon: Gem, description: 'Any other valuable items' }
]

/**
 * Format currency for display
 * @param {number} value 
 * @returns {string}
 */
function formatCurrency(value) {
  if (value === undefined || value === null || isNaN(value)) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value)
}

/**
 * AddItemForm component - Form for adding manual insurance items
 * 
 * Features:
 * - 10+ insurance-relevant categories
 * - Fields: name (text), category (select), estimated value (number, $ formatted)
 * - Validation: all fields required, value must be positive number
 * - Edit mode: can edit existing items
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback when modal is closed
 * @param {Object} [props.editItem] - Item to edit (if in edit mode)
 * @param {Function} props.onSave - Callback when item is saved (for external handling)
 */
export function AddItemForm({ isOpen, onClose, editItem = null, onSave }) {
  const { addManualItem, updateManualItem, policyType } = useAppContext()
  
  // Form state
  const [name, setName] = useState(editItem?.name || '')
  const [category, setCategory] = useState(editItem?.category || '')
  const [value, setValue] = useState(editItem?.estimatedValue || '')
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEditMode = !!editItem

  /**
   * Validate form fields
   * @returns {Object} errors object
   */
  const validateForm = useCallback(() => {
    const newErrors = {}
    
    if (!name || name.trim() === '') {
      newErrors.name = 'Name is required'
    }
    
    if (!category) {
      newErrors.category = 'Category is required'
    }
    
    const numericValue = parseFloat(value)
    if (!value || isNaN(numericValue) || numericValue <= 0) {
      newErrors.value = 'Value must be a positive number'
    }
    
    return newErrors
  }, [name, category, value])

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    
    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    
    setIsSubmitting(true)
    
    // Get coverage info for the selected category
    const coverageInfo = lookupCoverage(category, policyType)
    
    const itemData = {
      id: editItem?.id || `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      category: category,
      displayCategory: MANUAL_CATEGORIES.find(c => c.id === category)?.label || category,
      estimatedValue: parseFloat(value),
      status: coverageInfo.status,
      color: coverageInfo.color,
      note: coverageInfo.note,
      conditions: coverageInfo.conditions || [],
      upgrade: coverageInfo.upgrade,
      source: 'manual',
      createdAt: editItem?.createdAt || new Date().toISOString()
    }
    
    // Call the appropriate action
    if (isEditMode) {
      updateManualItem(editItem.id, itemData)
    } else {
      addManualItem(itemData)
    }
    
    // Call external save handler if provided
    if (onSave) {
      onSave(itemData)
    }
    
    // Reset and close
    setIsSubmitting(false)
    handleClose()
  }, [name, category, value, editItem, isEditMode, policyType, addManualItem, updateManualItem, onSave, validateForm])

  /**
   * Handle close and reset
   */
  const handleClose = useCallback(() => {
    if (!isEditMode) {
      setName('')
      setCategory('')
      setValue('')
    }
    setErrors({})
    onClose()
  }, [isEditMode, onClose])

  /**
   * Handle value input with currency formatting
   */
  const handleValueChange = useCallback((e) => {
    const inputValue = e.target.value.replace(/[^0-9.]/g, '')
    setValue(inputValue)
    if (errors.value) {
      setErrors(prev => ({ ...prev, value: null }))
    }
  }, [errors.value])

  /**
   * Handle category selection
   */
  const handleCategorySelect = useCallback((catId) => {
    setCategory(catId)
    if (errors.category) {
      setErrors(prev => ({ ...prev, category: null }))
    }
  }, [errors.category])

  /**
   * Handle name change
   */
  const handleNameChange = useCallback((e) => {
    setName(e.target.value)
    if (errors.name) {
      setErrors(prev => ({ ...prev, name: null }))
    }
  }, [errors.name])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-item-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 
            id="add-item-title" 
            className="text-xl font-bold text-gray-900 flex items-center gap-2"
          >
            {isEditMode ? (
              <>
                <Edit2 className="w-5 h-5 text-blue-600" />
                Edit Item
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 text-blue-600" />
                Add Manual Item
              </>
            )}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Name Field */}
          <div>
            <label 
              htmlFor="item-name" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="item-name"
              value={name}
              onChange={handleNameChange}
              placeholder="e.g., Grandmother's Diamond Ring"
              className={`
                w-full px-4 py-3 rounded-lg border-2 transition-all
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                ${errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'}
              `}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
              autoFocus
            />
            {errors.name && (
              <p id="name-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <span className="inline-block w-4 h-4 rounded-full bg-red-100 text-red-600 text-xs flex items-center justify-center font-bold">!</span>
                {errors.name}
              </p>
            )}
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <div 
              className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto p-1"
              role="radiogroup"
              aria-label="Select item category"
            >
              {MANUAL_CATEGORIES.map((cat) => {
                const Icon = cat.icon
                const isSelected = category === cat.id
                
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleCategorySelect(cat.id)}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border-2 text-left
                      transition-all duration-200
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                      ${isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                      ${errors.category && !isSelected ? 'border-red-200' : ''}
                    `}
                  >
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center
                      ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}
                    `}>
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                        {cat.label}
                      </p>
                      <p className={`text-xs ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                        {cat.description}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            {errors.category && (
              <p id="category-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <span className="inline-block w-4 h-4 rounded-full bg-red-100 text-red-600 text-xs flex items-center justify-center font-bold">!</span>
                {errors.category}
              </p>
            )}
          </div>

          {/* Value Field */}
          <div>
            <label 
              htmlFor="item-value" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Estimated Value <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                $
              </span>
              <input
                type="text"
                id="item-value"
                value={value}
                onChange={handleValueChange}
                placeholder="0.00"
                className={`
                  w-full pl-8 pr-4 py-3 rounded-lg border-2 transition-all
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  ${errors.value ? 'border-red-300 bg-red-50' : 'border-gray-200'}
                `}
                aria-invalid={!!errors.value}
                aria-describedby={errors.value ? 'value-error' : undefined}
              />
            </div>
            {errors.value && (
              <p id="value-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <span className="inline-block w-4 h-4 rounded-full bg-red-100 text-red-600 text-xs flex items-center justify-center font-bold">!</span>
                {errors.value}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Enter the approximate replacement cost of this item
            </p>
          </div>

          {/* Coverage Preview */}
          {category && value && !errors.value && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Coverage Preview</h4>
              {(() => {
                const coverage = lookupCoverage(category, policyType)
                return (
                  <div className="space-y-1 text-sm">
                    <p className="text-blue-800">
                      Status: <span className={`font-semibold ${
                        coverage.color === 'green' ? 'text-green-600' :
                        coverage.color === 'yellow' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {coverage.status === 'covered' ? 'Covered' :
                         coverage.status === 'conditional' ? 'Conditional' :
                         'Not Covered'}
                      </span>
                    </p>
                    <p className="text-blue-700">{coverage.note}</p>
                  </div>
                )
              })()}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-2.5 px-4 rounded-lg font-medium text-gray-700
              border border-gray-300 bg-white hover:bg-gray-50
              transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-[2] py-2.5 px-4 rounded-lg font-semibold text-white
              bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
              flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                {isEditMode ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {isEditMode ? 'Save Changes' : 'Add Item'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * ManualItemsList component - List of manual items with edit/remove actions
 * 
 * @param {Object} props
 * @param {Array} props.items - Array of manual items
 * @param {Function} props.onEdit - Callback when edit is clicked
 * @param {Function} props.onRemove - Callback when remove is clicked
 * @param {Function} props.onItemClick - Callback when item row is clicked
 */
export function ManualItemsList({ items = [], onEdit, onRemove, onItemClick }) {
  if (!items || items.length === 0) return null

  const statusColors = {
    covered: 'bg-green-100 text-green-700 border-green-200',
    conditional: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    not_covered: 'bg-red-100 text-red-700 border-red-200'
  }

  const statusLabels = {
    covered: 'Covered',
    conditional: 'Conditional',
    not_covered: 'Not Covered'
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors group"
        >
          <button
            onClick={() => onItemClick && onItemClick(item)}
            className="flex-1 flex items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1"
          >
            <div className={`w-2 h-2 rounded-full ${
              item.color === 'green' ? 'bg-green-500' :
              item.color === 'yellow' ? 'bg-yellow-500' :
              'bg-red-500'
            }`} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{item.name}</p>
              <p className="text-xs text-gray-500">{item.displayCategory || item.category}</p>
            </div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[item.status] || statusColors.not_covered}`}>
              {statusLabels[item.status] || 'Not Covered'}
            </span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(item.estimatedValue)}
            </span>
          </button>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit && onEdit(item)}
              className="p-2 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={`Edit ${item.name}`}
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onRemove && onRemove(item)}
              className="p-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label={`Remove ${item.name}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default AddItemForm
