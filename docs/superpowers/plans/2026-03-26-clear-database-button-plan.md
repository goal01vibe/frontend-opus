# Clear Database Button — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Vider DB" button in the Header (DEV mode only) that deletes all documents and extractions via the existing backend endpoint, with a confirmation dialog.

**Architecture:** A `ClearDatabaseDialog` component encapsulates the confirmation modal, API call, toast notifications, and query invalidation. The Header conditionally renders a trigger button when `devMode=true`. No backend changes needed — `adminService.clearDatabase()` and the `DELETE /admin/clear-database` endpoint already exist.

**Tech Stack:** React, TypeScript, Tailwind CSS, sonner (toasts), @tanstack/react-query, lucide-react icons

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/layout/ClearDatabaseDialog.tsx` | **Create** | Confirmation modal + API call + toast + query invalidation |
| `src/components/layout/Header.tsx` | **Modify** | Add trigger button (devMode only) + state + dialog import |

**Already exists (no changes):**
- `src/services/admin.ts` — `clearDatabase()` method at line 196
- Backend `DELETE /admin/clear-database?confirm=yes`

---

### Task 1: Create ClearDatabaseDialog component

**Files:**
- Create: `src/components/layout/ClearDatabaseDialog.tsx`

- [ ] **Step 1: Create the dialog component**

```tsx
// src/components/layout/ClearDatabaseDialog.tsx
import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { adminService } from '@/services/admin'

interface ClearDatabaseDialogProps {
  open: boolean
  onClose: () => void
}

export function ClearDatabaseDialog({ open, onClose }: ClearDatabaseDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const queryClient = useQueryClient()

  if (!open) return null

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      const result = await adminService.clearDatabase()
      const { documents, extractions } = result.deleted
      toast.success(`Base vidée : ${documents} documents et ${extractions} extractions supprimés`)
      queryClient.invalidateQueries()
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la suppression'
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={!isDeleting ? onClose : undefined} />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-full">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Vider la base de données</h2>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Cette action supprimera <strong>tous les documents et extractions</strong>.
          Les IDs seront remis à zéro. Cette opération est <strong>irréversible</strong>.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Suppression...
              </>
            ) : (
              'Supprimer tout'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify file compiles**

Run: `cd /c/frontend_opus && npx tsc --noEmit src/components/layout/ClearDatabaseDialog.tsx 2>&1 | head -20`

Expected: No errors (or only unrelated warnings)

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/ClearDatabaseDialog.tsx
git commit -m "feat: add ClearDatabaseDialog confirmation component"
```

---

### Task 2: Add trigger button to Header

**Files:**
- Modify: `src/components/layout/Header.tsx:1-138`

- [ ] **Step 1: Add imports**

At the top of `Header.tsx`, add `Trash2` to the lucide-react import and import the dialog:

```tsx
import { Menu, FileText, Search, Code2, Trash2 } from 'lucide-react'
```

Add after existing imports:

```tsx
import { useState } from 'react'
import { ClearDatabaseDialog } from './ClearDatabaseDialog'
```

- [ ] **Step 2: Add state inside the Header component**

Inside `export function Header()`, after the existing destructuring line (`const { setSearchOpen, devMode, toggleDevMode } = useUIStore()`), add:

```tsx
const [showClearDialog, setShowClearDialog] = useState(false)
```

- [ ] **Step 3: Add the trigger button in JSX**

Insert this block after the closing `)}` of the BDPM Status Badge section (after line 126) and before `{/* Extraction Module */}`:

```tsx
        {/* Clear Database - Dev Mode Only */}
        {devMode && (
          <button
            onClick={() => setShowClearDialog(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            title="Vider la base de données"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-xs font-medium">Vider DB</span>
          </button>
        )}
```

- [ ] **Step 4: Add the dialog component in JSX**

Insert just before the closing `</header>` tag:

```tsx
      <ClearDatabaseDialog open={showClearDialog} onClose={() => setShowClearDialog(false)} />
```

- [ ] **Step 5: Verify app compiles**

Run: `cd /c/frontend_opus && npx tsc --noEmit 2>&1 | head -20`

Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "feat: add clear database button in Header (DEV mode only)"
```

---

### Task 3: Manual testing checklist

- [ ] **Step 1: Verify button visibility**

1. Open the app in browser
2. Toggle to PROD mode → button should NOT be visible
3. Toggle to DEV mode → "Vider DB" button should appear (red, between BDPM badge and extraction module)

- [ ] **Step 2: Verify dialog flow**

1. Click "Vider DB" → confirmation modal opens
2. Click "Annuler" → modal closes, nothing happens
3. Click "Vider DB" again → click "Supprimer tout" → spinner shows → toast with counts → modal closes
4. Verify data tables are refreshed (empty)

- [ ] **Step 3: Verify error handling**

1. Stop the backend
2. Click "Vider DB" → "Supprimer tout" → error toast appears, modal stays open
3. Restart backend, retry → should succeed

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: clear database button complete (DEV mode only)"
```
