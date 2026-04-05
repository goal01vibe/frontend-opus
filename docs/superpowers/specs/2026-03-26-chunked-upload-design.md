# Design : Upload chunke avec progression globale

**Date** : 2026-03-26
**Projet** : frontend_opus (React/TypeScript/Vite)
**Probleme** : L'upload de 2521 fichiers en une seule requete multipart (~370MB) retourne 400 Bad Request.
**Solution** : Decouper automatiquement les fichiers en lots de 50 et les envoyer sequentiellement.

## Approche retenue

**Pipeline sequentiel d'upload avec traitement parallele** :
- Les chunks sont uploades un par un (pas de surcharge reseau)
- On n'attend pas la fin du traitement (workers Celery) avant d'envoyer le chunk suivant
- On attend seulement la reponse HTTP (batch_id) avant de passer au suivant
- Les workers traitent les fichiers en parallele pendant que les chunks continuent d'arriver

## Architecture

```
2521 fichiers selectionnes
       |
       v
  Decoupage en 51 chunks (50 x 50 + 1 x 21)
       |
       v
  Chunk 1 --> POST /extract-batch-worker --> batch_id_1
  Chunk 2 --> POST /extract-batch-worker --> batch_id_2
  Chunk 3 --> POST /extract-batch-worker --> batch_id_3
  ...
       |
       v
  SSE /admin/stream recoit events pour TOUS les batch_ids
       |
       v
  Agregation globale : 1847/2521 fichiers traites (73%)
```

## Composants

### 1. Hook `useChunkedUpload` (nouveau)

**Fichier** : `src/hooks/useChunkedUpload.ts`

**Responsabilite** : Decouper les fichiers en lots de 50, les envoyer sequentiellement, collecter les batch_ids.

**Interface** :
```typescript
interface UseChunkedUploadOptions {
  chunkSize?: number                    // Default : 50
  confidenceThreshold?: number          // Seuil de confiance a transmettre a chaque chunk
  onChunkSent?: (batchId: string, chunkIndex: number) => void
  onAllChunksSent?: () => void
  onChunkError?: (chunkIndex: number, error: Error) => void
}

interface UseChunkedUploadReturn {
  startUpload: (files: File[]) => Promise<void>
  cancel: () => void
  uploadPhase: 'idle' | 'uploading' | 'done' | 'cancelled'
  allChunksSent: boolean                // Flag pour condition de terminaison
  chunksUploaded: number
  totalChunks: number
}
```

**Comportement** :
- Decoupe `files[]` en chunks de `chunkSize`
- Boucle sequentielle : envoie chunk N, attend reponse HTTP, envoie chunk N+1
- Chaque chunk forward `confidence_threshold` dans les options
- Chaque reponse donne un `batch_id` ajoute au store Zustand via `addBatch()`
- Construction du `BatchProgress` : `total_files` = taille du chunk (pas le total global), `workers_active` = 0, `started_at` = ISO date
- Si erreur HTTP sur un chunk : marque les 50 fichiers en erreur avec `status: 'failed'` et `error: { code: 'ERROR_NETWORK', message }`, continue avec les chunks suivants
- Timeout par chunk : `AbortSignal.timeout(60000)` (60s) passe comme signal Axios. Si timeout, traite comme erreur HTTP (marque fichiers failed, continue)
- `cancel()` : abort via AbortController + stoppe la boucle. Fichiers non-envoyes marques `'failed'` avec `error: { code: 'ERROR_NETWORK', message: 'Upload annule' }`

**Note** : `activeBatchIds` est gere via `useRef<Set<string>>` dans ExtractionModal (pas dans le store Zustand, car Set n'est pas JSON-serialisable).

### 2. Composant `GlobalUploadProgress` (nouveau)

**Fichier** : `src/components/extraction/GlobalUploadProgress.tsx`

**Responsabilite** : Afficher la progression globale quand le nombre de fichiers depasse `chunkSize`.

**Maquette** :
```
+---------------------------------------------+
|  Extraction en cours                        |
|  ################________  1847 / 2521     |
|  73% -- Lot 38/51 en upload                 |
|                              [Annuler]      |
+---------------------------------------------+
```

**Position dans le JSX** : Place en `sticky top-0` au-dessus de la liste scrollable des fichiers, a l'interieur du modal mais en dehors du conteneur scrollable, pour rester toujours visible.

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
- Chaque appel chunk forward la valeur du slider `confidence` comme `confidence_threshold`
- `currentBatchIdRef` (string | null) --> `activeBatchIdsRef` (useRef<Set<string>>) pour eviter la serialisation Zustand
- Le callback `onBatchProgress` filtre sur `activeBatchIdsRef.current.has(data.batch_id)` au lieu de `=== currentBatchIdRef.current`
- Afficher `GlobalUploadProgress` au-dessus de la liste des fichiers quand `totalFiles > chunkSize`
- Bouton "Annuler" appelle `cancel()` du hook

**Condition de terminaison (anti-race)** :
```typescript
// Verifier dans DEUX endroits :
// 1. Dans le handler batch_complete (quand un batch termine)
// 2. Dans onAllChunksSent (quand la boucle d'upload finit)
const checkGlobalDone = () => {
  if (allChunksSent && activeBatchIdsRef.current.size === 0) {
    setIsUploading(false)
  }
}
```
Le flag `allChunksSent` empeche une fausse terminaison si le Set est momentanement vide entre deux chunks (race window).

**Fermeture du modal pendant l'upload** : appelle automatiquement `cancel()` avant de fermer. L'upload ne peut pas continuer en arriere-plan car l'etat `files[]` vit dans le composant.

### 4. Modifications `extractionStore.ts`

**Fichier** : `src/stores/extractionStore.ts`

**Pas de `GlobalUploadState`** dans le store. La progression globale (chunksUploaded, totalChunks, uploadPhase) est geree par le hook `useChunkedUpload` et passee directement a `GlobalUploadProgress` via props. Cela evite la duplication d'etat et les problemes de serialisation.

Le store conserve uniquement ses responsabilites actuelles :
- `activeBatches[]` : un `BatchProgress` par chunk (ajoute via `addBatch()`)
- `completedToday / failedToday / partialToday` : incrementes normalement par les events SSE

## Fichiers inchanges

| Fichier | Raison |
|---------|--------|
| `src/services/extractions.ts` | `extractBatch()` reste identique, appele par chunk |
| `src/hooks/useAdminStream.ts` | SSE deja fonctionnel, pas de modification necessaire |
| `src/services/api.ts` | Client Axios inchange |
| `src/types/index.ts` | `FileUploadStatus` inchange (on utilise `'failed'` pour les annulations, pas de nouveau statut) |
| Backend (Python/FastAPI) | Aucune modification cote serveur |

## Gestion des erreurs

| Scenario | Comportement |
|----------|-------------|
| Chunk echoue (HTTP 400/500) | Marquer ses 50 fichiers `'failed'` avec `ERROR_NETWORK`, continuer les chunks suivants |
| Chunk timeout (>60s sans reponse) | Traiter comme erreur HTTP, marquer failed, continuer |
| Reseau coupe | Stopper l'upload, garder la progression acquise |
| Utilisateur annule | Stopper l'envoi des chunks restants, fichiers non-envoyes marques `'failed'` avec message "Upload annule" |
| SSE deconnecte | Reconnexion auto existante dans `useAdminStream` |
| Modal ferme pendant upload | Appel automatique de `cancel()` |

## Limitations connues

**Filenames dupliques** : Le matching SSE se fait par `data.filename`. Si deux fichiers dans des chunks differents ont le meme nom (ex: `facture.pdf` dans deux dossiers), le SSE mettra a jour toutes les entrees correspondantes. C'est un probleme pre-existant qui devient plus visible a grande echelle. Correction future possible : utiliser un identifiant unique cote backend au lieu du filename.

## Recapitulatif des fichiers

| Fichier | Action |
|---------|--------|
| `src/hooks/useChunkedUpload.ts` | **Creer** |
| `src/components/extraction/GlobalUploadProgress.tsx` | **Creer** |
| `src/components/extraction/ExtractionModal.tsx` | **Modifier** |
| `src/stores/extractionStore.ts` | **Inchange** (pas de GlobalUploadState) |
