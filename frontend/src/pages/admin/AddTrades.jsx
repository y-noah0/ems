import React, { useState } from 'react'

export default function AddTrades() {
  const [formData, setFormData] = useState({
    category: '',
    level: '',
    tradeName: '',
    customLevel: ''
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Trade categories and their levels
  const tradeStructure = {
    REB: {
      olevel: ["S1", "S2", "S3"],
      alevel: {
        S4: ["PCM", "PCB", "MPC", "MCB", "MCE", "MEG", "HEG", "HLP", "HGL"],
        S5: ["PCM", "PCB", "MPC", "MCB", "MCE", "MEG", "HEG", "HLP", "HGL"],
        S6: ["PCM", "PCB", "MPC", "MCB", "MCE", "MEG", "HEG", "HLP", "HGL"]
      }
    },
    TVET: {
      L1: [
        "TAIL", "HAIR", "WELD", "MASN", "PLMB",
        "DRIV", "MINE", "LTHR"
      ],
      L2: [
        "GRPH", "CERM", "AUTO", "MCYC",
        "FRST", "FLWR", "CROP"
      ],
      L3: [
        "SWDV", "COMP", "CSYS", "MMPR", "NTWK", "BLDG",
        "CIVL", "PLMT", "ELEC", "FOOD", "HSKP", "AGRI"
      ],
      L4: [
        "BIOM", "MECH", "SURV", "IELC", "RENW", "HMCH", "ABDY"
      ],
      L5: [
        "CIVL", "CONC", "VREN", "AMNT", "SWDV", "SURV"
      ]
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }

    // Reset dependent fields when category changes
    if (name === 'category') {
      setFormData(prev => ({
        ...prev,
        level: '',
        tradeName: '',
        customLevel: ''
      }))
    }

    // Reset trade name when level changes
    if (name === 'level') {
      setFormData(prev => ({
        ...prev,
        tradeName: '',
        customLevel: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.category) {
      newErrors.category = 'Category is required'
    }

    if (!formData.level && !formData.customLevel) {
      newErrors.level = 'Level is required'
    }

    if (!formData.tradeName) {
      newErrors.tradeName = 'Trade name is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Here you would typically send the data to your backend API
      const tradeData = {
        category: formData.category,
        level: formData.customLevel || formData.level,
        tradeName: formData.tradeName
      }

      console.log('Submitting trade data:', tradeData)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Reset form after successful submission
      setFormData({
        category: '',
        level: '',
        tradeName: '',
        customLevel: ''
      })
      
      alert('Trade added successfully!')
      
    } catch (error) {
      console.error('Error adding trade:', error)
      alert('Error adding trade. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getAvailableLevels = () => {
    if (!formData.category) return []
    
    if (formData.category === 'REB') {
      return ['olevel', ...Object.keys(tradeStructure.REB.alevel)]
    } else if (formData.category === 'TVET') {
      return Object.keys(tradeStructure.TVET)
    }
    
    return []
  }

  const getAvailableTrades = () => {
    if (!formData.category || !formData.level) return []
    
    if (formData.category === 'REB') {
      if (formData.level === 'olevel') {
        return tradeStructure.REB.olevel
      } else if (tradeStructure.REB.alevel[formData.level]) {
        return tradeStructure.REB.alevel[formData.level]
      }
    } else if (formData.category === 'TVET') {
      return tradeStructure.TVET[formData.level] || []
    }
    
    return []
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Add New Trade</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category Selection */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.category ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select Category</option>
            <option value="REB">REB (Rwanda Education Board)</option>
            <option value="TVET">TVET (Technical and Vocational Education)</option>
          </select>
          {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
        </div>

        {/* Level Selection */}
        <div>
          <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-2">
            Level *
          </label>
          <select
            id="level"
            name="level"
            value={formData.level}
            onChange={handleInputChange}
            disabled={!formData.category}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.level ? 'border-red-500' : 'border-gray-300'
            } ${!formData.category ? 'bg-gray-100' : ''}`}
          >
            <option value="">Select Level</option>
            {getAvailableLevels().map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
            <option value="custom">Custom Level</option>
          </select>
          {errors.level && <p className="mt-1 text-sm text-red-600">{errors.level}</p>}
        </div>

        {/* Custom Level Input */}
        {formData.level === 'custom' && (
          <div>
            <label htmlFor="customLevel" className="block text-sm font-medium text-gray-700 mb-2">
              Custom Level Name *
            </label>
            <input
              type="text"
              id="customLevel"
              name="customLevel"
              value={formData.customLevel}
              onChange={handleInputChange}
              placeholder="Enter custom level name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Trade Name */}
        <div>
          <label htmlFor="tradeName" className="block text-sm font-medium text-gray-700 mb-2">
            Trade Name *
          </label>
          {formData.level && formData.level !== 'custom' && getAvailableTrades().length > 0 ? (
            <select
              id="tradeName"
              name="tradeName"
              value={formData.tradeName}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.tradeName ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select Trade</option>
              {getAvailableTrades().map(trade => (
                <option key={trade} value={trade}>{trade}</option>
              ))}
              <option value="custom">Custom Trade</option>
            </select>
          ) : (
            <input
              type="text"
              id="tradeName"
              name="tradeName"
              value={formData.tradeName}
              onChange={handleInputChange}
              placeholder="Enter trade name"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.tradeName ? 'border-red-500' : 'border-gray-300'
              }`}
            />
          )}
          {errors.tradeName && <p className="mt-1 text-sm text-red-600">{errors.tradeName}</p>}
        </div>

        {/* Custom Trade Name Input */}
        {formData.tradeName === 'custom' && (
          <div>
            <label htmlFor="customTradeName" className="block text-sm font-medium text-gray-700 mb-2">
              Custom Trade Name *
            </label>
            <input
              type="text"
              id="customTradeName"
              name="tradeName"
              value=""
              onChange={(e) => setFormData(prev => ({ ...prev, tradeName: e.target.value }))}
              placeholder="Enter custom trade name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`flex-1 py-2 px-4 rounded-md text-white font-medium ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
            }`}
          >
            {isSubmitting ? 'Adding Trade...' : 'Add Trade'}
          </button>
          
          <button
            type="button"
            onClick={() => {
              setFormData({
                category: '',
                level: '',
                tradeName: '',
                customLevel: ''
              })
              setErrors({})
            }}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Reset
          </button>
        </div>
      </form>

      {/* Preview Section */}
      {(formData.category || formData.level || formData.tradeName) && (
        <div className="mt-8 p-4 bg-gray-50 rounded-md">
          <h3 className="text-lg font-medium text-gray-800 mb-3">Preview</h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Category:</span> {formData.category || 'Not selected'}</p>
            <p><span className="font-medium">Level:</span> {formData.customLevel || formData.level || 'Not selected'}</p>
            <p><span className="font-medium">Trade Name:</span> {formData.tradeName || 'Not entered'}</p>
          </div>
        </div>
      )}
    </div>
  )
}
