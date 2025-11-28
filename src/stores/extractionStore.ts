import { create } from 'zustand'
import type { BatchProgress, BatchTask } from '@/types'

interface ExtractionState {
  isModuleExpanded: boolean
  activeBatches: BatchProgress[]
  completedToday: number
  failedToday: number
  currentTasks: BatchTask[]
  setModuleExpanded: (expanded: boolean) => void
  toggleModule: () => void
  addBatch: (batch: BatchProgress) => void
  updateBatch: (batchId: string, updates: Partial<BatchProgress>) => void
  removeBatch: (batchId: string) => void
  setTasks: (tasks: BatchTask[]) => void
  updateTask: (taskId: string, updates: Partial<BatchTask>) => void
  incrementCompleted: () => void
  incrementFailed: () => void
  resetDailyStats: () => void
}

export const useExtractionStore = create<ExtractionState>((set) => ({
  isModuleExpanded: false,
  activeBatches: [],
  completedToday: 0,
  failedToday: 0,
  currentTasks: [],

  setModuleExpanded: (expanded) => set({ isModuleExpanded: expanded }),
  toggleModule: () => set((state) => ({ isModuleExpanded: !state.isModuleExpanded })),

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

  setTasks: (tasks) => set({ currentTasks: tasks }),

  updateTask: (taskId, updates) => set((state) => ({
    currentTasks: state.currentTasks.map(t =>
      t.task_id === taskId ? { ...t, ...updates } : t
    )
  })),

  incrementCompleted: () => set((state) => ({
    completedToday: state.completedToday + 1
  })),

  incrementFailed: () => set((state) => ({
    failedToday: state.failedToday + 1
  })),

  resetDailyStats: () => set({ completedToday: 0, failedToday: 0 }),
}))
