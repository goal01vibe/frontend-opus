# Design : Upload chunké avec progression globale

**Date** : 2026-03-26
**Projet** : frontend_opus (React/TypeScript/Vite)
**Problème** : L'upload de 2521 fichiers en une seule requête multipart (~370MB) retourne 400 Bad Request.
**Solution** : Découper automatiquement les fichiers en lots de 50 et les envoyer séquentiellement.

## Approche retenue

**Pipeline séquentiel d'upload avec traitement parallèle** :
- Les chunks sont uploadés un par un (pas de surcharge réseau)
- On n'attend pas la fin du traitement (workers Celery) avant d'envoyer le chunk suivant
- On attend seulement la réponse HTTP (batch_id) avant de passer au suivant
- Les workers traitent les fichiers en parallèle pendant que les chunks continuent d'arriver

## Architecture

```
2521 fichiers sélectionnés
       │
       ▼
  Découpage en 51 chunks (50 × 50 + 1 × 21)
       │
       ▼
  Chunk 1 ──► POST /extract-batch-worker ──► batch_id_1
  Chunk 2 ──► POST /extract-batch-worker ──► batch_id_2
  Chunk 3 ──► POST /extract-batch-worker ──► batch_id_3
  ...
       │
       ▼
  SSE /admin/stream reçoit events pour TOUS les batch_ids
       │
       ▼
  Agrégation globale : 1847/2521 fichiers traités (73%)
```

## Composants

### 1. Hook `useChunkedUpload` (nouveau)

**Fichier** : `src/hooks/useChunkedUpload.ts`

**Responsabilité** : Découper les fichiers en lots de 50, les envoyer séquentiellement, collecter les batch_ids.

**Interface** :
```typescript
interface UseChunkedUploadOptions {
  chunkSize?: number          // Défaut : 50
  onChunkSent?: (batchId: string, chunkIndex: number) => void
  onAllChunksSent?: () => void
  onChunkError?: (chunkIndex: number, error: Error) => void
}

interface UseChunkedUploadReturn {
  startUpload: (files: File[]) => Promise<void>
  cancel: () => void
  uploadPhase: 'idle' | 'uploading' | 'done' | 'cancelled'
  activeBatchIds: Set<string>
  chunksUploaded: number
  totalChunks: number
}
```

**Comportement** :
- Découpe `files[]` en chunks de `chunkSize`
- Boucle séquentielle : envoie chunk N, attend réponse HTTP, envoie chunk N+1
- Chaque réponse donne un `batch_id` ajouté au store Zustand via `addBatch()`
- Si erreur HTTP sur un chunk : marque les 50 fichiers en erreur, continue avec les chunks suivants
- `cancel()` : abort via AbortController + stoppe la boucle

### 2. Composant `GlobalUploadProgress` (nouveau)

**Fichier** : `src/components/extraction/GlobalUploadProgress.tsx`

**Responsabilité** : Afficher la progression globale quand le nombre de fichiers dépasse `chunkSize`.

**Maquette** :
```
┌─────────────────────────────────────────────┐
│  Extraction en cours                        │
│  ████████████████░░░░░░░░  1847 / 2521     │
│  73% — Lot 38/51 en upload                  │
│                              [Annuler]      │
└─────────────────────────────────────────────┘
```

**Props** :
```typescript
interface GlobalUploadProgressProps {
  totalFiles: number
  completedFiles: number
  failedFiles: number
  totalChunks: number
  chunksUploaded: number
  onCancel: () => void
}
```

### 3. Modifications `ExtractionModal.tsx`

**Fichier** : `src/components/extraction/ExtractionModal.tsx`

**Changements** :
- Remplacer l'appel unique `extractionsService.extractBatch(allFiles)` par `useChunkedUpload`
- `currentBatchIdRef` (string) → `activeBatchIdsRef` (Set<string>)
- Le callback `onBatchProgress` filtre sur `activeBatchIds.has(data.batch_id)` au lieu de `=== currentBatchIdRef`
- Afficher `GlobalUploadProgress` au-dessus de la liste des fichiers quand `totalFiles > chunkSize`
- Bouton "Annuler" appelle `cancel()` du hook
- `batch_complete` d'un chunk retire le batch_id du Set ; l'upload global est terminé quand le Set est vide ET tous les chunks sont envoyés

### 4. Modifications `extractionStore.ts`

**Fichier** : `src/stores/extractionStore.ts`

**Ajouts** :
```typescript
interface GlobalUploadState {
  totalFiles: number
  completedFiles: number
  failedFiles: number
  totalChunks: number
  chunksUploaded: number
  status: 'idle' | 'uploading' | 'done' | 'cancelled'
}

// Nouvelles actions
startGlobalUpload: (totalFiles: number, totalChunks: number) => void
updateGlobalUpload: (partial: Partial<GlobalUploadState>) => void
resetGlobalUpload: () => void
```

## Fichiers inchangés

| Fichier | Raison |
|---------|--------|
| `src/services/extractions.ts` | `extractBatch()` reste identique, appelé par chunk |
| `src/hooks/useAdminStream.ts` | SSE déjà fonctionnel, pas de modification nécessaire |
| `src/services/api.ts` | Client Axios inchangé |
| Backend (Python/FastAPI) | Aucune modification côté serveur |

## Gestion des erreurs

| Scénario | Comportement |
|----------|-------------|
| Chunk échoue (HTTP 400/500) | Marquer ses 50 fichiers en erreur, continuer les chunks suivants |
| Réseau coupé | Stopper l'upload, garder la progression acquise |
| Utilisateur annule | Stopper l'envoi des chunks restants, fichiers non-envoyés marqués "cancelled" |
| SSE déconnecté | Reconnexion auto existante dans `useAdminStream` |

## Récapitulatif des fichiers

| Fichier | Action |
|---------|--------|
| `src/hooks/useChunkedUpload.ts` | **Créer** |
| `src/components/extraction/GlobalUploadProgress.tsx` | **Créer** |
| `src/components/extraction/ExtractionModal.tsx` | **Modifier** |
| `src/stores/extractionStore.ts` | **Modifier** |
