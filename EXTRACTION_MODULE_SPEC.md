# Module d'Extraction v2 - Spécifications Complètes

> **Date**: 2025-11-30 (mis à jour)
> **Status**: En cours de développement
> **Version cible**: 2.0

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture](#2-architecture)
3. [Bibliothèques et Dépendances](#3-bibliothèques-et-dépendances)
4. [Modal d'extraction](#4-modal-dextraction)
5. [Barre de progression Header](#5-barre-de-progression-header)
6. [Page dédiée /extractions/live](#6-page-dédiée-extractionslive)
7. [Gestion des erreurs PDF](#7-gestion-des-erreurs-pdf)
8. [Staging Redis](#8-staging-redis-24h)
9. [Onglet PDFs Protégés](#9-onglet-pdfs-protégés)
10. [Mécanisme de Retry](#10-mécanisme-de-retry)
11. [Statistiques et Historique](#11-statistiques-et-historique)
12. [Configuration Admin](#12-configuration-admin)
13. [Endpoints Backend](#13-endpoints-backend)
14. [Plan d'implémentation](#14-plan-dimplémentation)

---

## 1. Vue d'ensemble

### 1.1 Objectif

Refonte complète du module d'extraction pour offrir :
- Une expérience utilisateur fluide et non-bloquante
- Une gestion robuste des erreurs et cas particuliers
- Un suivi en temps réel des extractions
- Une traçabilité complète sur 30 jours

### 1.2 Flux global

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FLUX D'EXTRACTION                              │
└─────────────────────────────────────────────────────────────────────────┘

    [Utilisateur]
         │
         ▼
┌─────────────────┐
│  MODAL          │  • Sélection fichiers (drag & drop)
│  EXTRACTION     │  • Configuration workers (1-4)
│                 │  • Seuil confiance
│                 │  • Pre-scan optionnel
└────────┬────────┘
         │ Click "Extraire"
         ▼
┌─────────────────┐
│  MODAL FERME    │  → Immédiatement après soumission
│  HEADER BADGE   │  → Badge "Extraction ●N" apparaît
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  QUEUE BACKEND  │  • 1 seul batch actif à la fois
│                 │  • Autres batchs en attente
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  WORKERS        │  • 4 workers max
│  CELERY         │  • Traitement parallèle
│                 │  • Timeout 2 min/fichier
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         RÉSULTATS PAR FICHIER                            │
├─────────────────┬─────────────────┬─────────────────┬───────────────────┤
│   ✅ SUCCÈS     │   ⚠️ PARTIEL    │   ❌ ERREUR     │   🔐 PROTÉGÉ      │
│                 │                 │                 │                   │
│ → Insert DB     │ → Staging Redis │ → Log erreur    │ → File séparée    │
│                 │   (24h)         │   (30 jours)    │                   │
└─────────────────┴─────────────────┴─────────────────┴───────────────────┘
         │
         ▼
┌─────────────────┐
│  NOTIFICATION   │  • Toast "Batch terminé: X✓ Y⚠ Z✗"
│  + BADGE        │  • Badge persistant si erreurs
└─────────────────┘
```

---

## 2. Architecture

### 2.1 Stack technique

| Couche | Technologie | Rôle |
|--------|-------------|------|
| Frontend | React + TypeScript | Interface utilisateur |
| State | React Query + Zustand | Cache et état global |
| Temps réel | SSE (Server-Sent Events) | Progression live |
| Backend API | FastAPI | Endpoints REST |
| Queue | Celery + Redis | Workers asynchrones |
| Staging | Redis | Stockage temporaire 24h |
| Persistance | PostgreSQL | Base de données principale |

### 2.2 Flux de données

```
Frontend                    Backend                     Workers
────────                    ───────                     ───────
    │                           │                           │
    │  POST /extract-batch      │                           │
    │ ─────────────────────────>│                           │
    │                           │                           │
    │  { batch_id: "abc123" }   │  Celery task.delay()      │
    │ <─────────────────────────│ ─────────────────────────>│
    │                           │                           │
    │  GET /stream/{batch_id}   │                           │
    │ ─────────────────────────>│                           │
    │                           │                           │
    │  SSE: { file: 1, status } │      Redis pub/sub        │
    │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│<─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
    │  SSE: { file: 2, status } │                           │
    │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│                           │
    │  SSE: { complete }        │                           │
    │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│                           │
```

---

## 3. Bibliothèques et Dépendances

### 3.1 Backend (pdf-extractor) - Python

| Bibliothèque | Status | Version | Usage | Source |
|--------------|--------|---------|-------|--------|
| **fastapi** | ✅ Installé | 0.104.1 | Framework API REST | PyPI |
| **celery** | ✅ Installé | 5.3.4 | Workers asynchrones | PyPI |
| **redis** | ✅ Installé | 5.0.1 | Broker Celery + Staging | PyPI |
| **pymupdf** | ✅ Installé | 1.24.0 | Détection PDF scanné/corrompu | PyPI |
| **pdfplumber** | ✅ Installé | 0.10.3 | Extraction texte PDF | PyPI |
| **sse-starlette** | ⚠️ À installer | ^2.1.0 | SSE streaming temps réel | [PyPI](https://pypi.org/project/sse-starlette/) |
| **pikepdf** | ⚠️ À installer | ^8.0.0 | Gestion PDF protégés par MDP | [PyPI](https://pypi.org/project/pikepdf/) |

**Installation requise :**
```bash
pip install sse-starlette pikepdf
# Ou ajouter à requirements.txt :
# sse-starlette>=2.1.0
# pikepdf>=8.0.0
```

### 3.2 Frontend (frontend_opus) - React/TypeScript

| Bibliothèque | Status | Version | Usage |
|--------------|--------|---------|-------|
| **@tanstack/react-query** | ✅ Installé | ^5.56.2 | Cache, fetching, mutations |
| **@tanstack/react-table** | ✅ Installé | ^8.x | Tables avec tri, filtres, pagination |
| **react-dropzone** | ✅ Installé | ^14.2.3 | Upload drag & drop |
| **recharts** | ✅ Installé | ^2.12.7 | Graphiques statistiques |
| **zustand** | ✅ Installé | ^4.5.5 | State management global |
| **sonner** | ✅ Installé | ^1.5.0 | Toast notifications |
| **axios** | ✅ Installé | ^1.7.7 | HTTP client |
| **EventSource** | ✅ Natif | Browser API | SSE client (reconnexion auto) |
| **@tanstack/react-virtual** | ⚠️ À installer | 3.13.12 | Virtualisation tables (milliers de lignes) |

**Virtualisation avec @tanstack/react-virtual :**

```bash
npm install @tanstack/react-virtual@3.13.12
```

| Propriété | Valeur |
|-----------|--------|
| **Version stable** | 3.13.12 (dernière release) |
| **Peer dependencies** | React ^16.8.0 \| ^17.0.0 \| ^18.0.0 \| ^19.0.0 |
| **Dépendance** | @tanstack/virtual-core@3.13.12 |
| **Compatibilité TanStack Table** | ✅ Totale (même écosystème) |
| **Bundle size** | ~18 kB |

**Exemple d'intégration avec TanStack Table existant :**

```tsx
import { useVirtualizer } from '@tanstack/react-virtual'
import { useReactTable, flexRender } from '@tanstack/react-table'

function VirtualizedExtractionsTable({ data, columns }) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })
  const { rows } = table.getRowModel()

  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // hauteur estimée d'une ligne
    overscan: 20, // lignes pré-rendues hors viewport
  })

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        <table>
          <tbody>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index]
              return (
                <tr key={row.id} style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

**Quand implémenter :** Dès que le nombre de lignes dépasse 500-1000 pour garantir des performances fluides.

### 3.3 Patterns de Code Clés

#### SSE Streaming avec sse-starlette (Backend)

```python
from sse_starlette import EventSourceResponse
from fastapi import Request
import asyncio
import json

async def stream_batch_progress(request: Request, batch_id: str):
    """Stream progression en temps réel via Redis pub/sub"""
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(f"batch:{batch_id}")

    try:
        async for message in pubsub.listen():
            if await request.is_disconnected():
                break
            if message["type"] == "message":
                yield {
                    "data": message["data"].decode(),
                    "event": "progress",
                    "id": str(time.time())
                }
    finally:
        await pubsub.unsubscribe(f"batch:{batch_id}")

@router.get("/extract-batch-worker/{batch_id}/stream")
async def stream_extraction(request: Request, batch_id: str):
    return EventSourceResponse(
        stream_batch_progress(request, batch_id),
        ping=15,  # Keepalive toutes les 15s
        ping_message_factory=lambda: {"comment": "keepalive"}
    )
```

#### Celery Task avec Progress Update (Backend)

```python
from celery import current_app
import redis

redis_client = redis.Redis()

@current_app.task(bind=True)
def process_pdf_task(self, file_content: bytes, filename: str, batch_id: str):
    """Traite un PDF et publie la progression"""
    try:
        # Mise à jour état Celery
        self.update_state(state='PROGRESS', meta={
            'filename': filename,
            'status': 'processing'
        })

        # Publication Redis pour SSE
        redis_client.publish(f"batch:{batch_id}", json.dumps({
            "type": "file_progress",
            "filename": filename,
            "status": "processing"
        }))

        # ... extraction logic ...

        return {"status": "success", "filename": filename}

    except Exception as e:
        redis_client.publish(f"batch:{batch_id}", json.dumps({
            "type": "file_error",
            "filename": filename,
            "error": str(e)
        }))
        raise
```

#### Détection PDF Scanné avec PyMuPDF (Backend)

```python
import pymupdf
from io import BytesIO

def detect_pdf_type(pdf_bytes: bytes) -> dict:
    """Détecte si un PDF est scanné, corrompu ou protégé"""
    try:
        doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        return {"type": "corrupted", "error": str(e)}

    total_text = ""
    total_images = 0

    for page in doc:
        text = page.get_text("text").strip()
        total_text += text
        images = page.get_images()
        total_images += len(images)

    doc.close()

    if not total_text and total_images > 0:
        return {"type": "scanned", "pages": len(doc), "images": total_images}

    return {"type": "text", "chars": len(total_text), "images": total_images}
```

#### Gestion PDF Protégé avec pikepdf (Backend)

```python
import pikepdf
from io import BytesIO

def check_pdf_protection(pdf_bytes: bytes) -> dict:
    """Vérifie si un PDF est protégé par mot de passe"""
    try:
        pdf = pikepdf.open(BytesIO(pdf_bytes))
        pdf.close()
        return {"protected": False}
    except pikepdf.PasswordError:
        return {"protected": True, "error_code": "E004"}
    except Exception as e:
        return {"protected": False, "corrupted": True, "error": str(e)}

def unlock_pdf(pdf_bytes: bytes, password: str) -> bytes:
    """Déverrouille un PDF protégé et retourne le contenu"""
    try:
        pdf = pikepdf.open(BytesIO(pdf_bytes), password=password)
        output = BytesIO()
        pdf.save(output)
        pdf.close()
        return output.getvalue()
    except pikepdf.PasswordError:
        raise ValueError("Mot de passe incorrect")
```

#### EventSource avec Reconnexion (Frontend)

```typescript
// hooks/useExtractionStream.ts
import { useEffect, useRef, useCallback } from 'react';
import { API_URL } from '@/lib/constants';

interface StreamEvent {
  type: 'file_progress' | 'batch_complete' | 'error';
  filename?: string;
  status?: string;
  progress?: number;
}

export function useExtractionStream(
  batchId: string | null,
  onEvent: (event: StreamEvent) => void
) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!batchId) return;

    const url = `${API_URL}/extract-batch-worker/${batchId}/stream`;
    const es = new EventSource(url);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onEvent(data);
        reconnectAttempts.current = 0; // Reset on success
      } catch (e) {
        console.error('Failed to parse SSE event:', e);
      }
    };

    es.onerror = () => {
      es.close();
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      }
    };

    es.addEventListener('complete', () => {
      es.close();
    });

    eventSourceRef.current = es;
  }, [batchId, onEvent]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
      clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect]);
}
```

### 3.4 Compatibilité Vérifiée

| Composant | Compatible | Notes |
|-----------|------------|-------|
| FastAPI + sse-starlette | ✅ | [Documentation officielle](https://github.com/sysid/sse-starlette) |
| Celery + Redis pub/sub | ✅ | [Pattern recommandé](https://celery.school/celery-progress-bars-with-fastapi-htmx) |
| PyMuPDF détection scan | ✅ | [Discussion GitHub](https://github.com/pymupdf/PyMuPDF/discussions/1653) |
| pikepdf password | ✅ | [Docs pikepdf](https://pikepdf.readthedocs.io/) |
| React EventSource | ✅ | API native, reconnexion manuelle |
| HTTP/2 SSE | ✅ | Supporte 100+ connexions simultanées |

---

## 4. Modal d'extraction

### 4.1 Structure UI

```
┌─────────────────────────────────────────────────────────────┐
│  ╳  Nouvelle extraction                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📁                                                  │    │
│  │     Glissez-déposez vos PDFs                        │    │
│  │     ou cliquez pour sélectionner                    │    │
│  │     (max 50MB par fichier, 100 pages)               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  3 fichier(s) sélectionné(s)      [Tout supprimer]  │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  📄 facture_001.pdf       796 KB            [✗]     │    │
│  │  📄 facture_002.pdf       1.2 MB            [✗]     │    │
│  │  📄 facture_003.pdf       534 KB            [✗]     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ─────────────── Options avancées ▼ ───────────────────     │
│                                                              │
│  Workers:        [■■■■○○] 4                                  │
│  Confiance min:  [■■■■■■░░░░] 60%                           │
│  Pre-scan:       [OFF]                                       │
│  Template forcé: [Auto-détection ▼]                         │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                    [Annuler]    [Extraire (3)]              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Comportements

| Action | Comportement |
|--------|-------------|
| Drop fichiers | Ajout à la liste, validation format/taille |
| Click "Extraire" | Fermeture immédiate du modal |
| Fichier > 50MB | Message d'erreur, fichier non ajouté |
| Fichier non-PDF | Message d'erreur, fichier non ajouté |

### 3.3 Options avancées

| Option | Type | Défaut | Description |
|--------|------|--------|-------------|
| Workers | Slider 1-4 | 4 | Nombre de workers parallèles |
| Confiance min | Slider 0-100% | 60% | Seuil pour staging |
| Pre-scan | Toggle | OFF | Analyse avant extraction |
| Template forcé | Dropdown | Auto | Forcer un template spécifique |

---

## 4. Barre de progression Header

### 4.1 États visuels

**Aucune extraction en cours :**
```
[Extraction ▼]
```

**Extraction en cours :**
```
[Extraction ●3] ████████░░░░ 6/10 │ 5✓ 1⏳ │ [→]
```

**Extraction terminée avec erreurs :**
```
[Extraction 🔴2] Terminé │ 8✓ 2✗ │ [→]
```

### 4.2 Composants

| Élément | Description |
|---------|-------------|
| Badge ●N | Nombre de fichiers en cours |
| Barre progression | Pourcentage global |
| Compteurs | ✓ succès, ⏳ en cours, ✗ erreurs |
| Bouton → | Lien vers page dédiée |
| Badge 🔴N | Erreurs non traitées (persistant) |

### 4.3 Notifications Toast

| Événement | Toast |
|-----------|-------|
| Batch démarré | "Extraction démarrée: 10 fichiers" |
| Fichier OK | Aucun (silencieux) |
| Fichier erreur | "Erreur: facture_003.pdf - PDF scanné" |
| Batch terminé | "Extraction terminée: 8✓ 2✗" |

---

## 5. Page dédiée /extractions/live

### 5.1 Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Extractions en temps réel                           [Exporter CSV]     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────┐  ┌────────────────────────────────────────┐   │
│  │  WORKERS             │  │  [Actif] [Staging (3)] [Protégés (1)]  │   │
│  │  ● Worker 1: Busy    │  ├────────────────────────────────────────┤   │
│  │  ● Worker 2: Busy    │  │                                        │   │
│  │  ○ Worker 3: Idle    │  │  BATCH #abc123 - En cours              │   │
│  │  ○ Worker 4: Idle    │  │  ████████████░░░░░░ 65% (13/20)        │   │
│  │                      │  │                                        │   │
│  │  QUEUE               │  │  Temps écoulé: 45s                     │   │
│  │  📦 2 batchs en      │  │  Temps estimé: 25s restant             │   │
│  │     attente          │  │                                        │   │
│  │                      │  │  ┌────────────────────────────────┐    │   │
│  │  MÉTRIQUES           │  │  │ ✓ facture_001.pdf  OCP   98%   │    │   │
│  │  Temps moy: 2.3s     │  │  │ ✓ facture_002.pdf  CDP   95%   │    │   │
│  │  Taux succès: 94%    │  │  │ ⚠ facture_003.pdf  ---   67%   │    │   │
│  │  Traités 24h: 156    │  │  │ 🔄 facture_004.pdf  En cours...│    │   │
│  │                      │  │  │ ⏳ facture_005.pdf  En attente │    │   │
│  └──────────────────────┘  │  │ ⏳ facture_006.pdf  En attente │    │   │
│                            │  │ ...                             │    │   │
│                            │  └────────────────────────────────┘    │   │
│                            └────────────────────────────────────────┘   │
│                                                                          │
│  ─────────────────────────── HISTORIQUE (30 jours) ─────────────────────│
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  [Graphique: Extractions par jour - Succès vs Erreurs]            │  │
│  │  ▁▂▃▅▇█▆▄▃▂▁▂▃▅▇                                                  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Date       │ Batch    │ Fichiers │ Succès │ Erreurs │ Durée     │  │
│  │  29/11 14:32│ #def456  │ 25       │ 23     │ 2       │ 58s       │  │
│  │  29/11 11:15│ #abc123  │ 10       │ 10     │ 0       │ 23s       │  │
│  │  28/11 16:45│ #xyz789  │ 50       │ 47     │ 3       │ 2m 15s    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Onglets

#### Onglet "Actif"
- Batch en cours avec progression temps réel
- Liste des fichiers avec statut individuel
- Queue des batchs en attente

#### Onglet "Staging (N)"
- Extractions partielles en attente de validation
- Timer d'expiration (24h)
- Actions: Voir, Éditer, Retry, Valider, Supprimer

#### Onglet "Protégés (N)"
- PDFs nécessitant un mot de passe
- Champ saisie mot de passe
- Actions: Déverrouiller, Supprimer

### 5.3 Panneau Workers

| État | Icône | Description |
|------|-------|-------------|
| Busy | ● vert | Worker en train de traiter un fichier |
| Idle | ○ gris | Worker disponible |
| Error | ● rouge | Worker en erreur |

### 5.4 Métriques temps réel

| Métrique | Description |
|----------|-------------|
| Temps moyen | Durée moyenne par fichier |
| Taux succès | % de fichiers extraits avec succès |
| Traités 24h | Nombre total sur les dernières 24h |
| Queue | Nombre de fichiers en attente |

---

## 6. Gestion des erreurs PDF

### 6.1 Types d'erreurs

| Code | Type | Détection | Action | Message utilisateur |
|------|------|-----------|--------|---------------------|
| `E001` | PDF Scanné | Pas de texte extractible | Rejeter | "PDF scanné détecté - extraction impossible sans OCR" |
| `E002` | PDF Corrompu | Parsing échoue | Rejeter | "PDF corrompu ou illisible" |
| `E003` | PDF Tronqué | EOF manquant | Rejeter | "PDF incomplet ou tronqué" |
| `E004` | PDF Protégé | Flag password | File séparée | "PDF protégé par mot de passe" |
| `E005` | Trop volumineux | > limite taille | Rejeter | "PDF trop volumineux (max 50MB)" |
| `E006` | Trop de pages | > limite pages | Rejeter | "PDF trop long (max 100 pages)" |
| `E007` | Doublon | Hash existe en DB | Skip | "PDF déjà traité" |
| `E008` | Timeout | > 2 minutes | Erreur | "Extraction timeout (> 2 min)" |
| `E009` | Sans template | Aucun match | Erreur | "Aucun template correspondant trouvé" |
| `E010` | Extraction partielle | Confiance < seuil | Staging | "Extraction partielle - vérification requise" |
| `E011` | Format invalide | Pas un PDF | Rejeter | "Format de fichier invalide" |
| `E012` | Score confiance faible | confidence_score < 70 | NEEDS_REVIEW | "Score de confiance faible" |
| `E013` | Écart TTC | HT + TVA ≠ Net à payer | NEEDS_REVIEW | "Total HT + TVA ≠ Net à payer" |
| `E014` | Écart lignes | Qté × Prix ≠ Montant | NEEDS_REVIEW | "Lignes avec écarts détectées" |

### 6.2 Panneau d'erreurs détaillé

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ▼ Erreurs (3 fichiers)                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  ❌ facture_scan.pdf                                             │    │
│  │  ──────────────────────────────────────────────────────────────  │    │
│  │  Type: PDF Scanné (E001)                                         │    │
│  │  Taille: 2.4 MB │ Pages: 3                                       │    │
│  │  Détecté: 29/11/2025 14:32:15                                    │    │
│  │  Détails: Aucun texte extractible détecté sur les 3 pages        │    │
│  │                                                                   │    │
│  │  [🗑️ Supprimer] [🔄 Retry] [📥 Télécharger] [🚨 Signaler]        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  ❌ facture_broken.pdf                                           │    │
│  │  ──────────────────────────────────────────────────────────────  │    │
│  │  Type: PDF Corrompu (E002)                                       │    │
│  │  Taille: 156 KB │ Pages: N/A                                     │    │
│  │  Détecté: 29/11/2025 14:32:18                                    │    │
│  │  Détails: Erreur parsing: Invalid PDF header                     │    │
│  │                                                                   │    │
│  │  [🗑️ Supprimer] [🔄 Retry] [📥 Télécharger] [🚨 Signaler]        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Actions sur erreurs

| Action | Icône | Description |
|--------|-------|-------------|
| Supprimer | 🗑️ | Retire le fichier de la liste d'erreurs |
| Retry | 🔄 | Relance l'extraction (après correction éventuelle) |
| Télécharger | 📥 | Télécharge le PDF original pour inspection |
| Signaler | 🚨 | Crée un ticket/log pour analyse ultérieure |

---

## 7. Système de Validation et Review Reasons (NOUVEAU)

> **Status**: ✅ IMPLÉMENTÉ côté backend (2025-11-30)

### 7.1 Principe

Les documents extraits passent par un système de validation automatique qui génère :
- Un **confidence_score** (0-100) ajusté selon les erreurs détectées
- Un **status** : `AUTO_PROCESSED`, `NEEDS_REVIEW`, `VALIDATED`, `FAILED`
- Une liste de **review_reasons** expliquant pourquoi un document nécessite une vérification

### 7.2 Review Reasons (messages utilisateur)

| Icône | Message | Déclencheur |
|-------|---------|-------------|
| ❓ | "Aucun template compatible détecté pour ce document" | `template_used` est null |
| ❌ | "X ligne(s) avec écart Qté × Prix ≠ Montant" | Lignes avec calcul incorrect |
| ❌ | "Somme lignes HT (X€) ≠ Somme bases TVA" | Total HT ne correspond pas aux bases TVA |
| ❌ | "Total HT + TVA ≠ Net à payer (X€)" | Validation TTC échouée |
| ❌ | "Écart TTC important: X€ (Y%)" | Écart TTC > seuil |
| ⚠️ | "Score de confiance faible: X/100" | Score < 70 sans autre raison |

### 7.3 API Response

```typescript
// GET /documents
interface Document {
  id: number;
  nom_fichier: string;
  status: 'AUTO_PROCESSED' | 'NEEDS_REVIEW' | 'VALIDATED' | 'FAILED';
  confidence_score: number;  // 0-100
  review_reasons: string[];  // Liste des raisons (vide si OK)
  template_used: string | null;
  // ... autres champs
}
```

### 7.4 Endpoints Validation Manuelle (✅ IMPLÉMENTÉS)

| Méthode | Endpoint | Description | Action sur review_reasons |
|---------|----------|-------------|---------------------------|
| `PATCH` | `/documents/{id}/validate` | Valide manuellement | **Efface** review_reasons |
| `PATCH` | `/documents/{id}/reject?reason=...` | Rejette le document | **Ajoute** la raison de rejet |

#### Exemple de réponse validation :
```json
{
  "message": "Document validé avec succès",
  "document_id": 24,
  "old_status": "NEEDS_REVIEW",
  "new_status": "VALIDATED",
  "review_reasons_cleared": true
}
```

#### Exemple de réponse rejet :
```json
{
  "message": "Document rejeté",
  "document_id": 24,
  "old_status": "NEEDS_REVIEW",
  "new_status": "FAILED",
  "rejection_reason": "Montants incohérents"
}
```

### 7.5 Interface Frontend Requise

#### 7.5.1 Liste Documents - Affichage review_reasons

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Documents nécessitant vérification (NEEDS_REVIEW)                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  ⚠️ facture_CSP_001.pdf                     Score: 0/100        │    │
│  │  ──────────────────────────────────────────────────────────────  │    │
│  │  Raisons:                                                        │    │
│  │    ❓ Aucun template compatible détecté pour ce document         │    │
│  │                                                                   │    │
│  │  [👁️ Voir PDF] [✅ Valider] [❌ Rejeter]                         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  ⚠️ facture_OCP_003.pdf                     Score: 45/100       │    │
│  │  ──────────────────────────────────────────────────────────────  │    │
│  │  Raisons:                                                        │    │
│  │    ❌ 3 ligne(s) avec écart Qté × Prix ≠ Montant                 │    │
│  │    ❌ Total HT + TVA ≠ Net à payer (1234.56€)                    │    │
│  │                                                                   │    │
│  │  [👁️ Voir PDF] [✅ Valider] [❌ Rejeter]                         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 7.5.2 Modal de Rejet

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ╳  Rejeter le document                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Fichier: facture_OCP_003.pdf                                           │
│                                                                          │
│  Raison du rejet (optionnel):                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Montants totalement incohérents, document illisible             │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│                           [Annuler]    [❌ Confirmer le rejet]          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 7.5.3 Filtres par status

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Filtres:  [Tous ▼]  [AUTO_PROCESSED]  [NEEDS_REVIEW (5)]  [VALIDATED]  │
│            [FAILED]  [Score < 50]                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.6 Implémentation Frontend

#### Hook useDocumentValidation
```typescript
// hooks/useDocumentValidation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useValidateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: number) =>
      api.patch(`/documents/${documentId}/validate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    }
  });
}

export function useRejectDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, reason }: { documentId: number; reason?: string }) =>
      api.patch(`/documents/${documentId}/reject`, null, { params: { reason } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    }
  });
}
```

#### Composant ReviewReasonsBadges
```tsx
// components/extractions/ReviewReasonsBadges.tsx
interface ReviewReasonsBadgesProps {
  reasons: string[];
}

export function ReviewReasonsBadges({ reasons }: ReviewReasonsBadgesProps) {
  if (!reasons.length) return null;

  return (
    <div className="flex flex-col gap-1 mt-2">
      {reasons.map((reason, index) => (
        <span
          key={index}
          className="text-sm text-amber-700 bg-amber-50 px-2 py-1 rounded"
        >
          {reason}
        </span>
      ))}
    </div>
  );
}
```

---

## 8. Staging Redis (24h)

### 7.1 Principe

Les extractions avec un score de confiance inférieur au seuil configuré sont stockées temporairement dans Redis pendant 24h, permettant à l'utilisateur de :
- Vérifier les données extraites
- Corriger manuellement si nécessaire
- Valider pour insertion en DB
- Ou supprimer si inutilisable

### 7.2 Structure données Redis

```json
{
  "staging:abc123": {
    "batch_id": "abc123",
    "filename": "facture_003.pdf",
    "uploaded_at": "2025-11-29T14:32:15Z",
    "expires_at": "2025-11-30T14:32:15Z",
    "confidence": 0.67,
    "template_used": "OCP_v2",
    "extracted_data": {
      "metadata": {
        "numero_facture": "FAC-2025-001",
        "date_document": "2025-11-15",
        "fournisseur": "OCP",
        "net_a_payer": 1234.56
      },
      "lignes": [
        {
          "code_article": "ABC123",
          "designation_article": "Produit X",
          "quantite": 10,
          "prix_unitaire_ht": 12.50
        }
      ]
    },
    "warnings": [
      "Champ 'date_echeance' non trouvé",
      "Confiance faible sur 'net_a_payer'"
    ],
    "pdf_content": "<base64_encoded_pdf>"
  }
}
```

### 7.3 Interface Staging

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Staging - Extractions en attente (3)                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  ⚠️ facture_003.pdf                          Expire dans 23h 15m │    │
│  │  ──────────────────────────────────────────────────────────────  │    │
│  │  Template: OCP_v2 │ Confiance: 67%                               │    │
│  │                                                                   │    │
│  │  ⚠ Warnings:                                                     │    │
│  │    • Champ 'date_echeance' non trouvé                            │    │
│  │    • Confiance faible sur 'net_a_payer'                          │    │
│  │                                                                   │    │
│  │  [👁️ Voir] [✏️ Éditer] [🔄 Retry] [✅ Valider] [❌ Supprimer]    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.4 Actions Staging

| Action | Description |
|--------|-------------|
| 👁️ Voir | Affiche les données extraites en lecture seule |
| ✏️ Éditer | Ouvre un formulaire pour corriger les données |
| 🔄 Retry | Relance l'extraction avec un autre template |
| ✅ Valider | Insère les données en base PostgreSQL |
| ❌ Supprimer | Supprime définitivement du staging |

---

## 8. Onglet PDFs Protégés

### 8.1 Interface

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PDFs Protégés par mot de passe (2)                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  🔐 facture_confidentielle.pdf                                   │    │
│  │  ──────────────────────────────────────────────────────────────  │    │
│  │  Taille: 1.8 MB │ Uploadé: 29/11/2025 14:32                      │    │
│  │                                                                   │    │
│  │  Mot de passe: [________________________] [👁️]                   │    │
│  │                                                                   │    │
│  │  [🔓 Déverrouiller et extraire]              [🗑️ Supprimer]      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  🔐 rapport_annuel_2024.pdf                                      │    │
│  │  ──────────────────────────────────────────────────────────────  │    │
│  │  Taille: 5.2 MB │ Uploadé: 29/11/2025 14:35                      │    │
│  │                                                                   │    │
│  │  Mot de passe: [________________________] [👁️]                   │    │
│  │                                                                   │    │
│  │  [🔓 Déverrouiller et extraire]              [🗑️ Supprimer]      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Flux déverrouillage

1. Utilisateur saisit le mot de passe
2. Click "Déverrouiller et extraire"
3. Backend tente de déverrouiller le PDF
4. Si succès → Extraction normale → Résultat (succès/staging/erreur)
5. Si échec → Message "Mot de passe incorrect"

---

## 9. Mécanisme de Retry

### 9.1 Types de retry

| Type | Scope | Description |
|------|-------|-------------|
| Retry individuel | 1 fichier | Bouton par fichier en erreur |
| Retry global | Tous les échecs | "Retenter tous les échecs" |
| Retry filtré | Par type d'erreur | "Retenter les timeouts uniquement" |

### 9.2 Options de retry

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Retenter les extractions en erreur                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Fichiers en erreur: 5                                                   │
│                                                                          │
│  Filtrer par type:                                                       │
│  ☑️ Timeout (2)                                                          │
│  ☑️ Sans template (2)                                                    │
│  ☐ PDF Scanné (1) - Non retentable                                      │
│                                                                          │
│  Options:                                                                │
│  ☐ Forcer un template: [Sélectionner ▼]                                 │
│  ☐ Augmenter timeout: [5 min ▼]                                         │
│                                                                          │
│                         [Annuler]    [Retenter (4 fichiers)]            │
└─────────────────────────────────────────────────────────────────────────┘
```

### 9.3 Règles de retry

| Type d'erreur | Retentable | Condition |
|---------------|------------|-----------|
| Timeout | ✅ Oui | Peut réussir avec plus de temps |
| Sans template | ✅ Oui | Si nouveau template créé |
| PDF Scanné | ❌ Non | Nécessite OCR (hors scope) |
| PDF Corrompu | ❌ Non | Fichier irrécupérable |
| Doublon | ❌ Non | Déjà en base |

---

## 10. Statistiques et Historique

### 10.1 Métriques disponibles

| Métrique | Période | Description |
|----------|---------|-------------|
| Total extractions | 24h / 7j / 30j | Nombre de fichiers traités |
| Taux de succès | 24h / 7j / 30j | % de réussite |
| Temps moyen | 24h / 7j / 30j | Durée moyenne par fichier |
| Erreurs par type | 30j | Répartition des erreurs |
| Par fournisseur | 30j | Succès/erreurs par source |
| Par template | 30j | Performance par template |

### 10.2 Graphiques

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Extractions - 30 derniers jours                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  250│                                    ▄▄                              │
│     │                              ▄▄  ████                              │
│  200│                        ▄▄  ████  ████  ▄▄                          │
│     │                  ▄▄  ████  ████  ████  ████                        │
│  150│            ▄▄  ████  ████  ████  ████  ████  ▄▄                    │
│     │      ▄▄  ████  ████  ████  ████  ████  ████  ████                  │
│  100│▄▄  ████  ████  ████  ████  ████  ████  ████  ████  ▄▄             │
│     │██  ████  ████  ████  ████  ████  ████  ████  ████  ████           │
│   50│██  ████  ████  ████  ████  ████  ████  ████  ████  ████           │
│     │██  ████  ████  ████  ████  ████  ████  ████  ████  ████           │
│    0└────────────────────────────────────────────────────────           │
│      01   05   10   15   20   25   29                                   │
│                                                                          │
│      ████ Succès    ░░░░ Erreurs                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.3 Analyse par fournisseur

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Taux d'erreur par fournisseur (30 jours)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Fournisseur    │ Total  │ Succès │ Erreurs │ Taux erreur              │
│  ───────────────┼────────┼────────┼─────────┼─────────────              │
│  OCP            │ 450    │ 438    │ 12      │ 2.7%  ████░░░░░░         │
│  CDP            │ 320    │ 301    │ 19      │ 5.9%  ██████░░░░         │
│  ALLIANCE       │ 180    │ 165    │ 15      │ 8.3%  ████████░░         │
│  CERP           │ 95     │ 92     │ 3       │ 3.2%  ███░░░░░░░         │
│  PHOENIX        │ 45     │ 40     │ 5       │ 11.1% ███████████        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.4 Export

| Format | Contenu |
|--------|---------|
| CSV | Historique complet avec toutes les colonnes |
| PDF | Rapport formaté avec graphiques |

---

## 11. Configuration Admin

### 11.1 Page Administration > Extraction

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Administration > Configuration Extraction                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  LIMITES                                                                 │
│  ─────────────────────────────────────────────────────────────────      │
│  Taille max par PDF:     [50   ] MB                                     │
│  Pages max par PDF:      [100  ] pages                                  │
│  Fichiers max par batch: [100  ] fichiers                               │
│                                                                          │
│  TIMEOUTS                                                                │
│  ─────────────────────────────────────────────────────────────────      │
│  Timeout par fichier:    [120  ] secondes                               │
│  Timeout batch global:   [3600 ] secondes                               │
│                                                                          │
│  WORKERS                                                                 │
│  ─────────────────────────────────────────────────────────────────      │
│  Workers max:            [4    ]                                        │
│  Concurrence par worker: [2    ]                                        │
│                                                                          │
│  STAGING                                                                 │
│  ─────────────────────────────────────────────────────────────────      │
│  Durée staging Redis:    [24   ] heures                                 │
│  Seuil confiance:        [60   ] %                                      │
│                                                                          │
│  HISTORIQUE                                                              │
│  ─────────────────────────────────────────────────────────────────      │
│  Rétention erreurs:      [30   ] jours                                  │
│  Rétention logs:         [7    ] jours                                  │
│                                                                          │
│  LOGS                                                                    │
│  ─────────────────────────────────────────────────────────────────      │
│  Niveau logs extraction: [DEBUG ▼]                                      │
│                                                                          │
│                                    [Annuler]    [Enregistrer]           │
└─────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Paramètres

| Paramètre | Défaut | Min | Max | Description |
|-----------|--------|-----|-----|-------------|
| `max_file_size_mb` | 50 | 1 | 500 | Taille max par PDF |
| `max_pages` | 100 | 1 | 1000 | Pages max par PDF |
| `max_files_per_batch` | 100 | 1 | 500 | Fichiers max par batch |
| `timeout_per_file_sec` | 120 | 30 | 600 | Timeout par fichier |
| `timeout_batch_sec` | 3600 | 300 | 7200 | Timeout batch global |
| `max_workers` | 4 | 1 | 8 | Workers max |
| `staging_ttl_hours` | 24 | 1 | 168 | Durée staging Redis |
| `confidence_threshold` | 60 | 0 | 100 | Seuil confiance % |
| `error_retention_days` | 30 | 1 | 365 | Rétention erreurs |
| `log_level` | DEBUG | - | - | INFO, DEBUG, WARNING |

---

## 12. État du Backend - Existant vs À Créer

> **Référence**: Voir `BACKEND_ANALYSIS.md` pour l'analyse détaillée

### 12.0 Résumé Backend

| Composant | Status | Effort Restant |
|-----------|--------|----------------|
| Redis Staging Service | ✅ **EXISTE** (`app/services/redis_staging.py`) | - |
| Admin Logs/Level | ✅ **EXISTE** (`app/routers/admin_router.py`) | - |
| Admin Performance | ✅ **EXISTE** | - |
| Admin Stats | ✅ **EXISTE** | - |
| Détection PDF scanné | ✅ **EXISTE** (`app/pdf_extractor.py`) | - |
| Catégorisation erreurs | ✅ **EXISTE** (`app/routers/extraction_router.py`) | - |
| File Validator basique | ✅ **EXISTE** (`app/services/file_validator.py`) | - |
| Celery Tasks basiques | ✅ **EXISTE** (`app/tasks.py`) | - |
| **Review Reasons + Validation** | ✅ **EXISTE** (2025-11-30) | - |
| **Endpoints Validate/Reject** | ✅ **EXISTE** (`app/routers/data_router.py`) | - |
| **SSE Streaming** | ❌ Manque | **2-3h** |
| **Endpoints REST Staging** | ❌ Manque | **1-2h** |
| **Queue Management** | ❌ Manque | **1-2h** |
| **Redis pub/sub Tasks** | ❌ Manque | **1-2h** |
| Workers Status | ❌ Manque | 1h |
| Protected PDFs | ❌ Manque | 2h |
| File Validator avancé | ⚠️ Partiel | 1h |

### 12.1 Extraction

| Méthode | Endpoint | Description | Status |
|---------|----------|-------------|--------|
| `POST` | `/extract-batch-worker` | Lancer extraction batch | ✅ Existe |
| `GET` | `/extract-batch-worker/{id}/stream` | SSE progression temps réel | ❌ À créer |
| `GET` | `/extraction-queue` | État de la queue | ❌ À créer |
| `DELETE` | `/extraction-queue/{batch_id}` | Annuler un batch | ❌ À créer |
| `GET` | `/extraction-queue/position/{batch_id}` | Position d'un batch | ❌ À créer |

### 12.2 Workers

| Méthode | Endpoint | Description | Status |
|---------|----------|-------------|--------|
| `GET` | `/workers/status` | État des workers Celery | ❌ À créer |
| `GET` | `/workers/stats` | Statistiques workers | ❌ À créer |

### 12.3 Staging Redis

> **Note**: Le service `RedisStagingService` existe déjà avec toutes les méthodes.
> Il suffit de créer les endpoints REST pour l'exposer.

| Méthode | Endpoint | Description | Status | Service Existant |
|---------|----------|-------------|--------|------------------|
| `GET` | `/staging` | Liste items en staging | ❌ À créer | `get_all_pending_partials()` |
| `GET` | `/staging/stats` | Statistiques staging | ❌ À créer | `get_staging_stats()` |
| `GET` | `/staging/{batch_id}/{file_id}` | Détail d'un item | ❌ À créer | `get_partial_extraction()` |
| `PUT` | `/staging/{batch_id}/{file_id}` | Modifier données | ❌ À créer | - |
| `POST` | `/staging/{batch_id}/{file_id}/validate` | Valider → DB | ❌ À créer | - |
| `POST` | `/staging/{batch_id}/{file_id}/retry` | Retry extraction | ❌ À créer | - |
| `DELETE` | `/staging/{batch_id}/{file_id}` | Supprimer | ❌ À créer | `delete_partial_extraction()` |

### 12.4 Documents et Validation (✅ NOUVEAU 2025-11-30)

| Méthode | Endpoint | Description | Status |
|---------|----------|-------------|--------|
| `GET` | `/documents` | Liste documents avec review_reasons | ✅ **EXISTE** |
| `GET` | `/documents?search=XXX` | Recherche full-text | ✅ **EXISTE** |
| `GET` | `/documents?template=OCP_v1` | Filtre par template | ✅ **EXISTE** |
| `GET` | `/documents/{id}/pdf` | Télécharger PDF original | ✅ **EXISTE** |
| `PATCH` | `/documents/{id}/validate` | Valider manuellement (efface review_reasons) | ✅ **EXISTE** |
| `PATCH` | `/documents/{id}/reject?reason=X` | Rejeter (ajoute review_reasons) | ✅ **EXISTE** |

### 12.5 PDFs Protégés

| Méthode | Endpoint | Description | Status |
|---------|----------|-------------|--------|
| `GET` | `/protected-pdfs` | Liste PDFs protégés | ❌ À créer |
| `POST` | `/protected-pdfs/{id}/unlock` | Déverrouiller + extraire | ❌ À créer |
| `DELETE` | `/protected-pdfs/{id}` | Supprimer | ❌ À créer |

### 12.6 Erreurs et Historique

> **Note**: Admin router a déjà `/admin/performance/failures` pour les échecs récents

| Méthode | Endpoint | Description | Status |
|---------|----------|-------------|--------|
| `GET` | `/admin/performance/failures` | Échecs récents | ✅ Existe |
| `GET` | `/extraction-errors` | Liste erreurs récentes | ❌ À créer |
| `GET` | `/extraction-errors/stats` | Statistiques erreurs | ❌ À créer |
| `GET` | `/extraction-errors/history` | Historique 30 jours | ❌ À créer |
| `GET` | `/extraction-errors/export` | Export CSV | ❌ À créer |
| `DELETE` | `/extraction-errors/{id}` | Supprimer erreur | ❌ À créer |
| `POST` | `/extraction-errors/{id}/retry` | Retry fichier | ❌ À créer |

### 12.6 Administration (Logs & Config)

> **Note**: Les endpoints logs/debug existent déjà et sont fonctionnels !

| Méthode | Endpoint | Description | Status |
|---------|----------|-------------|--------|
| `GET` | `/admin/logs/level` | Niveau de log actuel | ✅ Existe |
| `POST` | `/admin/logs/level` | Changer niveau (DEBUG/INFO/WARNING/ERROR) | ✅ Existe |
| `GET` | `/admin/logs/recent` | Logs récents par type | ✅ Existe |
| `GET` | `/admin/logs/dashboard` | Dashboard complet | ✅ Existe |
| `GET` | `/admin/logs/search` | Recherche dans logs | ✅ Existe |
| `GET` | `/admin/performance/metrics` | Métriques détaillées | ✅ Existe |
| `GET` | `/admin/performance/current` | Traitements en cours | ✅ Existe |
| `GET` | `/admin/stats` | Stats base de données | ✅ Existe |
| `GET` | `/admin/templates/quality-report` | Rapport qualité templates | ✅ Existe |
| `GET` | `/admin/extraction-config` | Lire configuration extraction | ❌ À créer |
| `PUT` | `/admin/extraction-config` | Modifier configuration extraction | ❌ À créer |

### 12.7 Schémas de réponse

#### SSE Stream Events

```typescript
// Événement progression fichier
interface FileProgressEvent {
  type: 'file_progress';
  batch_id: string;
  file_index: number;
  filename: string;
  status: 'pending' | 'processing' | 'success' | 'partial' | 'error';
  confidence?: number;
  template?: string;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

// Événement batch complet
interface BatchCompleteEvent {
  type: 'batch_complete';
  batch_id: string;
  total: number;
  success: number;
  partial: number;
  errors: number;
  duration_seconds: number;
  timestamp: string;
}

// Événement erreur globale
interface BatchErrorEvent {
  type: 'batch_error';
  batch_id: string;
  error: string;
  timestamp: string;
}
```

#### Staging Item

```typescript
interface StagingItem {
  id: string;
  batch_id: string;
  filename: string;
  uploaded_at: string;
  expires_at: string;
  ttl_seconds: number;
  confidence: number;
  template_used: string;
  extracted_data: {
    metadata: Record<string, any>;
    lignes: Array<Record<string, any>>;
  };
  warnings: string[];
  pdf_url: string;
}
```

---

## 13. Plan d'implémentation (RÉVISÉ)

> ⚠️ **Plan mis à jour** suite à l'analyse du backend existant (voir `BACKEND_ANALYSIS.md`)
>
> **Gain de temps significatif** : Beaucoup de composants existent déjà !

---

### Phase 1: Backend Core - SSE + Pub/Sub (1 jour)

> **Dépendances à installer** : `pip install sse-starlette pikepdf`

#### 1.1 Modifier `tasks.py` - Publication Redis
- [ ] Ajouter import Redis pub/sub
- [ ] Publier `file_start` au début du traitement
- [ ] Publier `file_complete` ou `file_error` à la fin
- [ ] Publier `batch_complete` quand tous terminés
- [ ] Tests unitaires

#### 1.2 Créer endpoint SSE `/extract-batch-worker/{id}/stream`
- [ ] Installer `sse-starlette`
- [ ] Créer endpoint SSE avec `EventSourceResponse`
- [ ] S'abonner au channel Redis `batch:{batch_id}`
- [ ] Gérer déconnexion client
- [ ] Tests

---

### Phase 2: Backend - Endpoints REST Staging (0.5 jour)

> **Note**: Le service `RedisStagingService` existe déjà à 100% !
> Il suffit de créer les endpoints REST.

#### 2.1 Créer `app/routers/staging_router.py`
- [ ] `GET /staging` → `get_all_pending_partials()`
- [ ] `GET /staging/stats` → `get_staging_stats()`
- [ ] `GET /staging/{batch_id}/{file_id}` → `get_partial_extraction()`
- [ ] `DELETE /staging/{batch_id}/{file_id}` → `delete_partial_extraction()`
- [ ] `PUT /staging/{batch_id}/{file_id}` → Mise à jour données
- [ ] `POST /staging/{batch_id}/{file_id}/validate` → Insert DB + delete Redis
- [ ] `POST /staging/{batch_id}/{file_id}/retry` → Re-queue extraction
- [ ] Enregistrer router dans `main.py`

---

### Phase 3: Backend - Queue & Workers (0.5 jour)

#### 3.1 Endpoints Queue (dans `extraction_router.py`)
- [ ] `GET /extraction-queue` → État queue Celery
- [ ] `DELETE /extraction-queue/{batch_id}` → `celery.control.revoke()`
- [ ] `GET /extraction-queue/position/{batch_id}` → Position dans queue

#### 3.2 Créer `app/routers/workers_router.py`
- [ ] `GET /workers/status` → `celery.control.inspect().active()`
- [ ] `GET /workers/stats` → Statistiques workers
- [ ] Enregistrer router dans `main.py`

---

### Phase 4: Backend - PDFs Protégés (0.5 jour)

#### 4.1 Créer `app/routers/protected_router.py`
- [ ] Installer `pikepdf`
- [ ] Service stockage temporaire PDFs protégés (Redis avec TTL)
- [ ] `GET /protected-pdfs` → Liste
- [ ] `POST /protected-pdfs/{id}/unlock` → pikepdf.open(password) + extraction
- [ ] `DELETE /protected-pdfs/{id}` → Supprimer
- [ ] Enregistrer router dans `main.py`

---

### Phase 5: Backend - Erreurs & Config (0.5 jour)

> **Note**: `/admin/performance/failures` existe déjà pour les échecs récents

#### 5.1 Compléter gestion erreurs
- [ ] `GET /extraction-errors` → Erreurs avec pagination
- [ ] `GET /extraction-errors/stats` → Stats par type
- [ ] `GET /extraction-errors/export` → Export CSV
- [ ] `POST /extraction-errors/{id}/retry` → Re-queue

#### 5.2 Config extraction
- [ ] `GET /admin/extraction-config` → Lire config
- [ ] `PUT /admin/extraction-config` → Modifier config

---

### Phase 6: Frontend - Modal et Header (1 jour)

#### 6.1 Refonte Modal Extraction
- [ ] Ajouter slider workers (1-4)
- [ ] Ajouter slider confiance min (0-100%)
- [ ] Ajouter toggle pre-scan
- [ ] Ajouter dropdown template forcé
- [ ] Fermeture immédiate après submit
- [ ] Tests

#### 6.2 Composant `ExtractionProgressBar` (Header)
- [ ] Badge "Extraction ●N"
- [ ] Barre de progression globale
- [ ] Compteurs (succès, en cours, erreurs)
- [ ] Hook `useExtractionStream` avec SSE + reconnexion
- [ ] Notifications toast (sonner)
- [ ] Bouton lien vers /extractions/live

#### 6.3 Intégration Review Reasons (✅ Backend prêt)
- [ ] Hook `useDocumentValidation` (validate/reject mutations)
- [ ] Composant `ReviewReasonsBadges` (affichage raisons)
- [ ] Composant `DocumentValidationActions` (boutons Valider/Rejeter)
- [ ] Modal de rejet avec champ raison optionnel
- [ ] Filtres par status (AUTO_PROCESSED, NEEDS_REVIEW, VALIDATED, FAILED)
- [ ] Affichage confidence_score avec code couleur (vert >70, orange 50-70, rouge <50)
- [ ] Intégration endpoints `/documents/{id}/validate` et `/documents/{id}/reject`

---

### Phase 7: Frontend - Page Dédiée (2 jours)

#### 7.1 Structure `/extractions/live`
- [ ] Route dans react-router
- [ ] Layout responsive
- [ ] Onglets: Actif | Staging (N) | Protégés (N)

#### 7.2 Onglet Actif
- [ ] Progression batch temps réel (SSE)
- [ ] Liste fichiers avec statut individuel
- [ ] Panneau Workers (statut via polling)
- [ ] Queue batchs en attente

#### 7.3 Onglet Staging
- [ ] Liste items avec timer expiration
- [ ] Modal vue données extraites
- [ ] Modal édition données
- [ ] Actions: Voir, Éditer, Retry, Valider, Supprimer
- [ ] Intégration endpoints `/staging/*`

#### 7.4 Onglet Protégés
- [ ] Liste PDFs protégés
- [ ] Champ mot de passe avec toggle visibilité
- [ ] Action déverrouiller + extraire
- [ ] Intégration endpoints `/protected-pdfs/*`

#### 7.5 Panneau Erreurs
- [ ] Liste erreurs dépliable
- [ ] Filtres par type d'erreur
- [ ] Actions: Retry, Supprimer, Télécharger
- [ ] Intégration `/extraction-errors/*`

#### 7.6 Métriques & Historique
- [ ] Stats temps réel (polling `/admin/performance/metrics`)
- [ ] Graphique 30 jours (recharts)
- [ ] Tableau historique avec pagination
- [ ] Export CSV
- [ ] Intégration endpoints admin existants

---

### Phase 8: Frontend - Admin Config (0.5 jour)

#### 8.1 Section Configuration Extraction
- [ ] Formulaire paramètres (limites, timeouts, staging)
- [ ] Validation Zod
- [ ] Intégration `/admin/extraction-config`

---

### Phase 9: Tests E2E (1 jour)

#### 9.1 Tests Playwright
- [ ] Scénario extraction succès complet
- [ ] Scénario erreurs mixtes (scanné, corrompu, timeout)
- [ ] Scénario staging: voir → éditer → valider
- [ ] Scénario PDF protégé: déverrouiller → extraire
- [ ] Scénario retry individuel et global
- [ ] Test performance batch 20 fichiers

---

## Annexes

### A. Codes d'erreur (EXISTANTS)

> Ces codes sont déjà implémentés dans `app/routers/extraction_router.py`

| Code | Constante | Description | Status |
|------|-----------|-------------|--------|
| `CORRUPTED_PDF` | PDF corrompu | "Fichier PDF corrompu ou invalide" | ✅ Existe |
| `TRUNCATED_PDF` | PDF tronqué | "PDF incomplet ou tronqué" | ✅ Existe |
| `NO_TEMPLATE_DETECTED` | Pas de template | "Template non compatible" | ✅ Existe |
| `NO_TABLE_DATA` | Pas de tableau | "Aucun tableau détecté" | ✅ Existe |
| `PASSWORD_PROTECTED` | Protégé | "PDF protégé par mot de passe" | ✅ Existe |
| `ACCESS_DENIED` | Accès refusé | "Accès au fichier refusé" | ✅ Existe |
| `SCANNED_PDF` | PDF scanné | "OCR non supporté" | ✅ Existe |

### B. Estimation temps total (RÉVISÉE)

| Phase | Avant analyse | Après analyse | Gain |
|-------|---------------|---------------|------|
| Phase 1: SSE + Pub/Sub | 3-4 jours | **1 jour** | -2-3 jours |
| Phase 2: REST Staging | 2-3 jours | **0.5 jour** | -1.5-2.5 jours |
| Phase 3: Queue/Workers | 2-3 jours | **0.5 jour** | -1.5-2.5 jours |
| Phase 4: PDFs Protégés | inclus | **0.5 jour** | - |
| Phase 5: Erreurs/Config | inclus | **0.5 jour** | - |
| Phase 6: Modal/Header | 3-4 jours | **1 jour** | -2-3 jours |
| Phase 7: Page Dédiée | 4-5 jours | **2 jours** | -2-3 jours |
| Phase 8: Admin Config | 1-2 jours | **0.5 jour** | -0.5-1.5 jours |
| Phase 9: Tests E2E | 2-3 jours | **1 jour** | -1-2 jours |
| **TOTAL** | **17-24 jours** | **7-8 jours** | **~60% gagné** |

### C. Ordre d'implémentation recommandé

```
JOUR 1: Backend Core
├── Phase 1.1: Modifier tasks.py (pub/sub)
├── Phase 1.2: Endpoint SSE
└── Phase 2: Router staging

JOUR 2: Backend Complémentaire
├── Phase 3: Queue + Workers
├── Phase 4: PDFs protégés
└── Phase 5: Erreurs + Config

JOUR 3-4: Frontend Base
├── Phase 6.1: Modal extraction
├── Phase 6.2: Header progress bar
└── Début Phase 7

JOUR 5-6: Frontend Page Dédiée
├── Phase 7.1-7.4: Onglets
├── Phase 7.5: Erreurs
└── Phase 7.6: Métriques

JOUR 7: Finitions
├── Phase 8: Admin config
├── Phase 9: Tests E2E
└── Bug fixes
```

### D. Endpoints Admin Existants (à réutiliser)

```javascript
// Logs et Debug - DÉJÀ FONCTIONNELS
GET /admin/logs/level              // Niveau actuel
POST /admin/logs/level?level=DEBUG // Changer niveau
GET /admin/logs/dashboard          // Dashboard complet
GET /admin/logs/recent?log_type=app&lines=50

// Performance - DÉJÀ FONCTIONNELS
GET /admin/performance/metrics     // Métriques détaillées
GET /admin/performance/current     // En cours
GET /admin/performance/failures    // Échecs récents

// Stats - DÉJÀ FONCTIONNELS
GET /admin/stats                   // Stats DB
GET /admin/templates/quality-report
```

---

*Document généré le 2025-11-29*
