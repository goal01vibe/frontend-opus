import api from './api'
import type { Template } from '@/types'

export const templatesService = {
  getAll: async (): Promise<Template[]> => {
    const { data } = await api.get('/templates')
    return data
  },

  getByName: async (name: string): Promise<Template> => {
    const { data } = await api.get(`/templates/${name}`)
    return data
  },

  detect: async (file: File): Promise<{ template: string; confidence: number }> => {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/templates/detect', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  },

  create: async (template: Omit<Template, 'usage_stats'>): Promise<Template> => {
    const { data } = await api.post('/admin/templates', template)
    return data
  },

  update: async (name: string, template: Partial<Template>): Promise<Template> => {
    const { data } = await api.put(`/admin/templates/${name}`, template)
    return data
  },

  delete: async (name: string): Promise<void> => {
    await api.delete(`/admin/templates/${name}`)
  },

  activate: async (name: string): Promise<Template> => {
    const { data } = await api.post(`/admin/templates/${name}/activate`)
    return data
  },

  deactivate: async (name: string): Promise<Template> => {
    const { data } = await api.post(`/admin/templates/${name}/deactivate`)
    return data
  },

  test: async (name: string, file: File): Promise<any> => {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post(`/admin/templates/${name}/test`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  },
}
