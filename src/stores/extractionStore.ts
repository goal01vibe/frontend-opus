import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { BatchProgress, BatchTask, FileStatus, LiveMetrics } from '@/types'

interface ExtractionState {
  // Module expansion
  isModuleExpanded: boolean
  setModuleExpanded: (expanded: boolean) => void
  toggleModule: () => void

  // Upload Modal
  isUploadModalOpen: boolean
  openUploadModal: () => void
  closeUploadModal: () => void

  // Active batches
  activeBatches: BatchProgress[]
  addBatch: (batch: BatchProgress) => void
  updateBatch: (batchId: string, updates: Partial<BatchProgress>) => void
  removeBatch: (batchId: string) => void
  incrementBatchCompleted: (batchId: string) => void
  incrementBatchFailed: (batchId: string) => void

  // Current tasks
  currentTasks: BatchTask[]
  setTasks: (tasks: BatchTask[]) => void
  updateTask: (taskId: string, updates: Partial<BatchTask>) => void

  // File statuses (using Record for JSON serialization)
  fileStatuses: Record<string, Omit<FileStatus, 'file'> & { file?: never }>
  setFileStatus: (fileId: string, status: Omit<FileStatus, 'file'>) => void
  updateFileStatus: (fileId: string, updates: Partial<Omit<FileStatus, 'file'>>) => void
  removeFileStatus: (fileId: string) => void
  clearFileStatuses: () => void

  // Daily stats
  completedToday: number
  failedToday: number
  partialToday: number
  incrementCompleted: () => void
  incrementFailed: () => void
  incrementPartial: () => void
  resetDailyStats: () => void

  // Live metrics
  liveMetrics: LiveMetrics
  updateLiveMetrics: (metrics: Partial<LiveMetrics>) => void

  // Retry actions
  pendingRetries: string[]
  addPendingRetry: (fileId: string) => void
  removePendingRetry: (fileId: string) => void
  clearPendingRetries: () => void
}

const initialLiveMetrics: LiveMetrics = {
  docsPerSecond: 0,
  successRate: 100,
  estimatedTimeRemaining: 0,
  activeWorkers: 0,
  totalProcessed: 0,
  totalFailed: 0,
}

export const useExtractionStore = create<ExtractionState>()(
  persist(
    (set) => ({
      // Module expansion
      isModuleExpanded: false,
      setModuleExpanded: (expanded) => set({ isModuleExpanded: expanded }),
      toggleModule: () => set((state) => ({ isModuleExpanded: !state.isModuleExpanded })),

      // Upload Modal
      isUploadModalOpen: false,
      openUploadModal: () => set({ isUploadModalOpen: true, isModuleExpanded: false }),
      closeUploadModal: () => set({ isUploadModalOpen: false }),

      // Active batches
      activeBatches: [],
      addBatch: (batch) => set((state) => ({
        activeBatches: [...state.activeBatches, batch]
      })),
      updateBatch: (batchId, updates) => set((state) => ({
        activeBatches: state.activeBatches.map(b =>
          b.batch_id === batchId ? { ...b, ...updates } : b
        )
      })),
      removeBatch: (batchId) => set((state) => ({
        activeBatches: state.activeBatches.filter(b => b.batch_id !== batchId)
      })),
      incrementBatchCompleted: (batchId) => set((state) => ({
        activeBatches: state.activeBatches.map(b =>
          b.batch_id === batchId ? { ...b, completed: (b.completed || 0) + 1 } : b
        )
      })),
      incrementBatchFailed: (batchId) => set((state) => ({
        activeBatches: state.activeBatches.map(b =>
          b.batch_id === batchId ? { ...b, failed: (b.failed || 0) + 1 } : b
        )
      })),

      // Current tasks
      currentTasks: [],
      setTasks: (tasks) => set({ currentTasks: tasks }),
      updateTask: (taskId, updates) => set((state) => ({
        currentTasks: state.currentTasks.map(t =>
          t.task_id === taskId ? { ...t, ...updates } : t
        )
      })),

      // File statuses
      fileStatuses: {},
      setFileStatus: (fileId, status) => set((state) => ({
        fileStatuses: { ...state.fileStatuses, [fileId]: status }
      })),
      updateFileStatus: (fileId, updates) => set((state) => ({
        fileStatuses: {
          ...state.fileStatuses,
          [fileId]: state.fileStatuses[fileId]
            ? { ...state.fileStatuses[fileId], ...updates }
            : state.fileStatuses[fileId]
        }
      })),
      removeFileStatus: (fileId) => set((state) => {
        const { [fileId]: _, ...rest } = state.fileStatuses
        return { fileStatuses: rest }
      }),
      clearFileStatuses: () => set({ fileStatuses: {} }),

      // Daily stats
      completedToday: 0,
      failedToday: 0,
      partialToday: 0,
      incrementCompleted: () => set((state) => ({
        completedToday: state.completedToday + 1
      })),
      incrementFailed: () => set((state) => ({
        failedToday: state.failedToday + 1
      })),
      incrementPartial: () => set((state) => ({
        partialToday: state.partialToday + 1
      })),
      resetDailyStats: () => set({
        completedToday: 0,
        failedToday: 0,
        partialToday: 0
      }),

      // Live metrics
      liveMetrics: initialLiveMetrics,
      updateLiveMetrics: (metrics) => set((state) => ({
        liveMetrics: { ...state.liveMetrics, ...metrics }
      })),

      // Retry actions
      pendingRetries: [],
      addPendingRetry: (fileId) => set((state) => ({
        pendingRetries: [...state.pendingRetries, fileId]
      })),
      removePendingRetry: (fileId) => set((state) => ({
        pendingRetries: state.pendingRetries.filter(id => id !== fileId)
      })),
      clearPendingRetries: () => set({ pendingRetries: [] }),
    }),
    {
      name: 'extraction-progress',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        // Only persist essential data that survives page refresh
        activeBatches: state.activeBatches,
        completedToday: state.completedToday,
        failedToday: state.failedToday,
        partialToday: state.partialToday,
        // Don't persist: isModuleExpanded, isUploadModalOpen, fileStatuses (contains File objects)
      }),
    }
  )
)
