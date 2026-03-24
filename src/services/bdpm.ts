import api from './api'

export interface BdpmStatus {
  last_download: string | null
  last_integration: string | null
  last_check: string | null
  medicaments_count: number
  last_error: {
    timestamp: string
    message: string
  } | null
  has_error: boolean
  status_file_exists: boolean
}

export const bdpmService = {
  getStatus: async (): Promise<BdpmStatus> => {
    const { data } = await api.get<BdpmStatus>('/bdpm/status')
    return data
  },
}
