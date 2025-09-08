import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import tradeService from '../../services/tradeService'
import Layout from '../../components/layout/Layout'
import Button from '../../components/ui/Button'

export default function AddTrades({ onClose, onCreate }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)
  const [formData, setFormData] = useState({ category: '', level: '', name: '', code: '', description: '' })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)

  const levelOptions = {
    REB: ['S1','S2','S3','S4','S5','S6'],
    TVET: ['L1','L2','L3','L4','L5'],
    PRIMARY: ['P1','P2','P3','P4','P5','P6'],
    CAMBRIDGE: ['G1','G2','G3','G4','G5','G6','G7','G8','G9','G10','G11','G12']

  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.category) newErrors.category = 'Category is required'
    if (!formData.level) newErrors.level = 'Level is required'
    if (!formData.name) newErrors.name = 'Name is required'
    if (!formData.code) newErrors.code = 'Code is required'
    if( !formData.description) newErrors.description = 'Description is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setIsSubmitting(true)
    try {
      const payload = { category: formData.category, level: formData.level, name: formData.name, code: formData.code, description: formData.description }
      if (isEditing) {
        await tradeService.updateTrade(id, payload)
      } else {
        await tradeService.createTrade(payload)
        onCreate && onCreate(payload)
      }
      onClose && onClose()
      // navigate back after adding
      navigate('/admin/trades')
    } catch {
      alert('Error adding trade. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      if (!isEditing) return
      try {
        setLoading(true)
        const existing = await tradeService.getTradeById(id)
        setFormData({
          category: existing.category || '',
          level: formData.level || '',
          name: existing.name || '',
          code: existing.code || '',
          description: existing.description || ''
        })
  } catch {
        // If failed to load, go back
        navigate('/admin/trades')
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return (
    <Layout>
      <div className="inset-0 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
          <h2 className="text-xl font-semibold mb-4">{isEditing ? 'Edit Trade' : 'Add New Trade'}</h2>
          {loading ? (
            <div className="py-8 text-center text-gray-500">Loading...</div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <select name="category" value={formData.category} onChange={handleInputChange} className="w-full border px-3 py-2 rounded">
                <option value="">Select Category</option>
                <option value="REB">REB</option>
                <option value="TVET">TVET</option>
              </select>
              {errors.category && <p className="text-red-600 text-sm mt-1">{errors.category}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Level *</label>
              <select name="level" value={formData.level} onChange={handleInputChange} disabled={!formData.category} className="w-full border px-3 py-2 rounded">
                <option value="">Select Level</option>
                {formData.category && levelOptions[formData.category].map(lvl => (<option key={lvl} value={lvl}>{lvl}</option>))}
              </select>
              {errors.level && <p className="text-red-600 text-sm mt-1">{errors.level}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full border px-3 py-2 rounded" />
              {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Code *</label>
              <input type="text" name="code" value={formData.code} onChange={handleInputChange} className="w-full border px-3 py-2 rounded" />
              {errors.code && <p className="text-red-600 text-sm mt-1">{errors.code}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description *</label>
              <textarea name="description" value={formData.description} onChange={handleInputChange} rows={3} className="w-full border px-3 py-2 rounded" />
              {errors.description && <p className="text-red-600 text-sm mt-1">{errors.description}</p>}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant='danger' size='sm' type="button" onClick={() => navigate('/admin/trades')}>Cancel</Button>
              <Button size='sm' type="submit" disabled={isSubmitting}>
                {isSubmitting ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save Changes' : 'Add Trade')}
              </Button>
            </div>
          </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
