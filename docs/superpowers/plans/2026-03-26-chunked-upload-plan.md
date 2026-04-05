# Chunked Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split large file uploads into sequential batches of 50, with a global progress bar, so that uploading 2500+ files no longer triggers a 400 Bad Request.

**Architecture:** A new `useChunkedUpload` hook owns the chunking loop and sends chunks sequentially via the existing `extractionsService.extractBatch()`. A new `GlobalUploadProgress` component displays aggregate progress. `ExtractionModal` is modified to use both, tracking multiple `batch_id`s via a `useRef<Set>`.

**Tech Stack:** React 18, TypeScript, Axios, Zustand, Tailwind CSS, SSE (EventSource)

**Spec:** `docs/superpowers/specs/2026-03-26-chunked-upload-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/hooks/useChunkedUpload.ts` | **Create** | Chunk splitting, sequential upload loop, cancel, timeout |
| `src/components/extraction/GlobalUploadProgress.tsx` | **Create** | Global progress bar with cancel button |
| `src/components/extraction/ExtractionModal.tsx` | **Modify** | Wire hook + component, multi-batch SSE filtering |
| `src/services/extractions.ts` | **Modify** | Add AbortSignal + confidence_threshold params |

No changes to: `extractionStore.ts`, `useAdminStream.ts`, `types/index.ts`, backend.

---

## Task 1: Create `useChunkedUpload` hook

**Files:**
- Create: `src/hooks/useChunkedUpload.ts`

- [ ] **Step 1: Create the hook file with chunk utility and state**

```typescript
// src/hooks/useChunkedUpload.ts
import { useState, useRef, useCallback } from 'react'
import { extractionsService } from '@/services/extractions'
import { useExtractionStore } from '@/stores/extractionStore'

const DEFAULT_CHUNK_SIZE = 50
const CHUNK_TIMEOUT_MS = 60_000

interface UseChunkedUploadOptions {
  chunkSize?: number
  confidenceThreshold?: number
  onChunkSent?: (batchId: string, chunkIndex: number) => void
  onAllChunksSent?: () => void
  onChunkError?: (chunkIndex: number, error: Error) => void
  onBatchIdCreated?: (batchId: string) => void
}

type UploadPhase = 'idle' | 'uploading' | 'done' | 'cancelled'

/** Split an array into chunks of `size` */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

export function useChunkedUpload(options: UseChunkedUploadOptions = {}) {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    confidenceThreshold,
    onChunkSent,
    onAllChunksSent,
    onChunkError,
    onBatchIdCreated,
  } = options

  const [uploadPhase, setUploadPhase] = useState<UploadPhase>('idle')
  const [allChunksSent, setAllChunksSent] = useState(false)
  const [chunksUploaded, setChunksUploaded] = useState(0)
  const [totalChunks, setTotalChunks] = useState(0)

  const abortControllerRef = useRef<AbortController | null>(null)
  const cancelledRef = useRef(false)

  const { addBatch } = useExtractionStore()

  const startUpload = useCallback(async (
    files: File[],
    markChunkFilesFailed: (chunkFiles: File[], message: string) => void,
  ) => {
    const chunks = chunkArray(files, chunkSize)
    setTotalChunks(chunks.length)
    setChunksUploaded(0)
    setAllChunksSent(false)
    setUploadPhase('uploading')
    cancelledRef.current = false

    abortControllerRef.current = new AbortController()

    for (let i = 0; i < chunks.length; i++) {
      // Check cancellation before each chunk
      if (cancelledRef.current) {
        // Mark remaining files as failed
        for (let j = i; j < chunks.length; j++) {
          markChunkFilesFailed(chunks[j], 'Upload annule')
        }
        break
      }

      try {
        // Create a per-chunk timeout signal combined with the cancel signal
        const timeoutController = new AbortController()
        const timeoutId = setTimeout(() => timeoutController.abort(), CHUNK_TIMEOUT_MS)

        // If main abort fires, also abort this chunk
        const onMainAbort = () => timeoutController.abort()
        abortControllerRef.current.signal.addEventListener('abort', onMainAbort)

        const result = await extractionsService.extractBatch(
          chunks[i],
          { template: undefined, confidence_threshold: confidenceThreshold },
          timeoutController.signal,
        )

        clearTimeout(timeoutId)
        abortControllerRef.current.signal.removeEventListener('abort', onMainAbort)

        // Register batch in store for FloatingExtractionModule
        addBatch({
          batch_id: result.batch_id,
          total_files: chunks[i].length,
          completed: 0,
          failed: 0,
          workers_active: 0,
          started_at: new Date().toISOString(),
        })

        // Notify parent of new batch_id
        onBatchIdCreated?.(result.batch_id)
        onChunkSent?.(result.batch_id, i)
        setChunksUploaded(i + 1)

      } catch (error) {
        // Mark this chunk's files as failed, continue with next chunk
        const message = error instanceof Error ? error.message : 'Erreur reseau'
        markChunkFilesFailed(chunks[i], message)
        onChunkError?.(i, error instanceof Error ? error : new Error(message))
        setChunksUploaded(i + 1)
      }
    }

    // All chunks have been sent (or cancelled)
    if (!cancelledRef.current) {
      setAllChunksSent(true)
      setUploadPhase('done')
      onAllChunksSent?.()
    }
  }, [chunkSize, addBatch, onChunkSent, onAllChunksSent, onChunkError, onBatchIdCreated])

  const cancel = useCallback(() => {
    cancelledRef.current = true
    abortControllerRef.current?.abort()
    setUploadPhase('cancelled')
  }, [])

  const reset = useCallback(() => {
    setUploadPhase('idle')
    setAllChunksSent(false)
    setChunksUploaded(0)
    setTotalChunks(0)
    cancelledRef.current = false
  }, [])

  return {
    startUpload,
    cancel,
    reset,
    uploadPhase,
    allChunksSent,
    chunksUploaded,
    totalChunks,
  }
}
```

- [ ] **Step 2: Add `signal` parameter to `extractionsService.extractBatch`**

In `src/services/extractions.ts`, modify the `extractBatch` method to accept an optional `AbortSignal`:

```typescript
// BEFORE (line 64-78):
extractBatch: async (
  files: File[],
  options: { template?: string } = {}
): Promise<{ batch_id: string; task_ids: string[]; stream_endpoint: string }> => {
  const formData = new FormData()
  files.forEach(file => formData.append('files', file))
  if (options.template) {
    formData.append('template', options.template)
  }
  const { data } = await api.post('/extract-batch-worker', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data
},

// AFTER:
extractBatch: async (
  files: File[],
  options: { template?: string; confidence_threshold?: number } = {},
  signal?: AbortSignal,
): Promise<{ batch_id: string; task_ids: string[]; stream_endpoint: string }> => {
  const formData = new FormData()
  files.forEach(file => formData.append('files', file))
  if (options.template) {
    formData.append('template', options.template)
  }
  if (options.confidence_threshold !== undefined) {
    formData.append('confidence_threshold', String(options.confidence_threshold))
  }
  const { data } = await api.post('/extract-batch-worker', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    signal,
  })
  return data
},
```

- [ ] **Step 3: Verify build compiles**

Run: `cd C:\frontend_opus && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useChunkedUpload.ts src/services/extractions.ts
git commit -m "feat: add useChunkedUpload hook for sequential batch upload"
```

---

## Task 2: Create `GlobalUploadProgress` component

**Files:**
- Create: `src/components/extraction/GlobalUploadProgress.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/extraction/GlobalUploadProgress.tsx
import { X } from 'lucide-react'

interface GlobalUploadProgressProps {
  totalFiles: number
  completedFiles: number
  failedFiles: number
  totalChunks: number
  chunksUploaded: number
  onCancel: () => void
}

export function GlobalUploadProgress({
  totalFiles,
  completedFiles,
  failedFiles,
  totalChunks,
  chunksUploaded,
  onCancel,
}: GlobalUploadProgressProps) {
  const processedFiles = completedFiles + failedFiles
  const percent = totalFiles > 0 ? Math.round((processedFiles / totalFiles) * 100) : 0

  return (
    <div className="sticky top-0 z-10 bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-blue-800">
          Extraction en cours
        </span>
        <button
          onClick={onCancel}
          className="p-1 hover:bg-blue-200 rounded text-blue-600 hover:text-red-600 transition-colors"
          title="Annuler"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-blue-200 rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-300 flex"
        >
          {/* Green = completed */}
          {completedFiles > 0 && (
            <div
              className="h-full bg-green-500"
              style={{ width: `${(completedFiles / totalFiles) * 100}%` }}
            />
          )}
          {/* Red = failed */}
          {failedFiles > 0 && (
            <div
              className="h-full bg-red-400"
              style={{ width: `${(failedFiles / totalFiles) * 100}%` }}
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-blue-700">
        <span>
          {processedFiles} / {totalFiles} fichiers traites ({percent}%)
        </span>
        <span>
          Lot {Math.min(chunksUploaded + 1, totalChunks)} / {totalChunks} en upload
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build compiles**

Run: `cd C:\frontend_opus && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/extraction/GlobalUploadProgress.tsx
git commit -m "feat: add GlobalUploadProgress component"
```

---

## Task 3: Wire `ExtractionModal` to use chunked upload

**Files:**
- Modify: `src/components/extraction/ExtractionModal.tsx`

This is the largest task. The changes are:
1. Import and use `useChunkedUpload`
2. Import and render `GlobalUploadProgress`
3. Replace `currentBatchIdRef` with `activeBatchIdsRef` (Set)
4. Replace `handleExtract` to use the hook
5. Update SSE filter to use Set
6. Add `checkGlobalDone` logic
7. Auto-cancel on close

- [ ] **Step 1: Update imports**

Add at the top of the file:

```typescript
import { useChunkedUpload } from '@/hooks/useChunkedUpload'
import { GlobalUploadProgress } from './GlobalUploadProgress'
```

- [ ] **Step 2: Replace `currentBatchIdRef` with `activeBatchIdsRef` and add chunked upload hook**

Replace line 23:
```typescript
// BEFORE:
const currentBatchIdRef = useRef<string | null>(null)

// AFTER:
const activeBatchIdsRef = useRef<Set<string>>(new Set())
const allChunksSentRef = useRef(false)
```

After the refs, add the chunked upload hook (destructure for stable refs):
```typescript
const CHUNK_SIZE = 50

const {
  startUpload: startChunkedUpload,
  cancel: cancelUpload,
  reset: resetUpload,
  uploadPhase,
  allChunksSent,
  chunksUploaded,
  totalChunks,
} = useChunkedUpload({
  confidenceThreshold: confidence,
  chunkSize: CHUNK_SIZE,
  onBatchIdCreated: useCallback((batchId: string) => {
    activeBatchIdsRef.current.add(batchId)
  }, []),
  onAllChunksSent: useCallback(() => {
    allChunksSentRef.current = true
    // Check if all batches already done
    if (activeBatchIdsRef.current.size === 0) {
      setIsUploading(false)
    }
  }, []),
})
```

- [ ] **Step 3: Fix SSE destructuring + update filter to use Set**

First, fix the dead variable in destructuring (line 26):
```typescript
// BEFORE:
const { isConnected, onBatchProgress } = useAdminStream({

// AFTER (remove dead onBatchProgress variable):
const { isConnected } = useAdminStream({
```

Then replace lines 28-31 (the batch_id filter inside the callback):
```typescript
// BEFORE:
if (!currentBatchIdRef.current || data.batch_id !== currentBatchIdRef.current) {
  return
}

// AFTER:
if (!activeBatchIdsRef.current.has(data.batch_id)) {
  return
}
```

- [ ] **Step 4: Update `batch_complete` handler to support multi-batch**

Replace lines 103-111 (the `case 'batch_complete':` block):
```typescript
// BEFORE:
case 'batch_complete':
  console.log('Batch termine:', data)
  if (data.batch_id) {
    removeBatch(data.batch_id)
  }
  currentBatchIdRef.current = null
  setIsUploading(false)
  break

// AFTER:
case 'batch_complete':
  if (data.batch_id) {
    removeBatch(data.batch_id)
    activeBatchIdsRef.current.delete(data.batch_id)
  }
  // Check global termination: all chunks sent AND no active batches left
  if (allChunksSentRef.current && activeBatchIdsRef.current.size === 0) {
    setIsUploading(false)
  }
  break
```

- [ ] **Step 5: Replace `handleExtract` with chunked version**

Replace the entire `handleExtract` function (lines 206-264):
```typescript
const handleExtract = async () => {
  if (pendingFiles.length === 0) return

  setIsUploading(true)
  allChunksSentRef.current = false
  activeBatchIdsRef.current = new Set()

  // Mark all pending as uploading
  setFiles((prev) =>
    prev.map((f) => (f.status === 'pending' ? { ...f, status: 'uploading' as const } : f))
  )

  const filesToUpload = pendingFiles.map((f) => f.file)

  // Helper to mark a chunk's files as failed
  const markChunkFilesFailed = (chunkFiles: File[], message: string) => {
    const chunkFilenames = new Set(chunkFiles.map((f) => f.name))
    setFiles((prev) =>
      prev.map((f) =>
        (f.status === 'uploading' || f.status === 'processing') && chunkFilenames.has(f.filename)
          ? {
              ...f,
              status: 'failed' as const,
              error: {
                code: 'ERROR_NETWORK' as const,
                message,
                recoverable: true,
              },
            }
          : f
      )
    )
  }

  // Start chunked upload — marks files as processing when each chunk succeeds
  await startChunkedUpload(filesToUpload, markChunkFilesFailed)

  // After loop: mark remaining 'uploading' files as 'processing' (they were sent successfully)
  setFiles((prev) =>
    prev.map((f) => (f.status === 'uploading' ? { ...f, status: 'processing' as const } : f))
  )
}
```

- [ ] **Step 6: Update `handleClose` to auto-cancel**

Replace the `handleClose` function (lines 201-204):
```typescript
// BEFORE:
const handleClose = useCallback(() => {
  currentBatchIdRef.current = null
  closeUploadModal()
}, [closeUploadModal])

// AFTER:
const handleClose = useCallback(() => {
  if (isUploading) {
    cancelUpload()
  }
  activeBatchIdsRef.current = new Set()
  allChunksSentRef.current = false
  resetUpload()
  closeUploadModal()
}, [closeUploadModal, isUploading, cancelUpload, resetUpload])
```

- [ ] **Step 7: Add `GlobalUploadProgress` to JSX**

Insert just before the file list `<div className="max-h-60 ...">` (before line 375), inside the `{files.length > 0 && ...}` block:

```tsx
{/* Global progress for chunked uploads */}
{isUploading && files.length > CHUNK_SIZE && (
  <GlobalUploadProgress
    totalFiles={files.length}
    completedFiles={completedFiles.length}
    failedFiles={failedFiles.length}
    totalChunks={totalChunks}
    chunksUploaded={chunksUploaded}
    onCancel={cancelUpload}
  />
)}
```

- [ ] **Step 8: Mark files as processing when each chunk response arrives**

In the `onBatchIdCreated` callback (step 2), we need to also mark that chunk's files from 'uploading' to 'processing'. However, since the hook doesn't know which files belong to which chunk, a simpler approach is already handled: after the entire `startUpload` loop finishes, we mark remaining 'uploading' files as 'processing' (step 5). For intermediate feedback, we can enhance `onChunkSent`:

Update the `useChunkedUpload` initialization to also mark files as processing:
```typescript
const chunkedUpload = useChunkedUpload({
  chunkSize: CHUNK_SIZE,
  onBatchIdCreated: useCallback((batchId: string) => {
    activeBatchIdsRef.current.add(batchId)
  }, []),
  onChunkSent: useCallback((_batchId: string, _chunkIndex: number) => {
    // Mark next CHUNK_SIZE uploading files as processing
    // Status guard skips already-processing files from previous chunks
    setFiles((prev) => {
      let remaining = CHUNK_SIZE
      return prev.map((f) => {
        if (f.status === 'uploading' && remaining > 0) {
          remaining--
          return { ...f, status: 'processing' as const }
        }
        return f
      })
    })
  }, []),
  onAllChunksSent: useCallback(() => {
    allChunksSentRef.current = true
    if (activeBatchIdsRef.current.size === 0) {
      setIsUploading(false)
    }
  }, []),
})
```

- [ ] **Step 9: Verify build compiles**

Run: `cd C:\frontend_opus && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 10: Commit**

```bash
git add src/components/extraction/ExtractionModal.tsx
git commit -m "feat: wire chunked upload into ExtractionModal with global progress"
```

---

## Task 4: Manual validation

- [ ] **Step 1: Start frontend dev server**

Run: `cd C:\frontend_opus && npm run dev`

- [ ] **Step 2: Test small upload (< 50 files)**

Upload 5-10 PDF files. Verify:
- No `GlobalUploadProgress` bar shown (below chunk threshold)
- Files process normally via single batch
- SSE events update file statuses correctly

- [ ] **Step 3: Test chunked upload (> 50 files)**

Upload 100+ PDF files. Verify:
- `GlobalUploadProgress` bar appears with correct total
- Chunks upload sequentially (check Network tab: multiple POST requests)
- File statuses update progressively (uploading -> processing -> complete/failed)
- Lot counter increments

- [ ] **Step 4: Test cancel**

During a chunked upload, click "Annuler". Verify:
- Upload stops (no more POST requests)
- Remaining files marked as failed with "Upload annule"
- Already-processing files continue in backend (SSE events still arrive)

- [ ] **Step 5: Test modal close during upload**

Start upload, close modal. Verify:
- Upload is cancelled
- No errors in console

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: chunked upload complete with global progress"
```
