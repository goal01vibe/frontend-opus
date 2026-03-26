# Server-Side Pagination — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace client-side filtering (limit=500, JS filtering) with server-side pagination, filtering, sorting, and aggregations across both backend (pdf-extractor) and frontend (frontend_opus).

**Architecture:** Backend `GET /documents` endpoint is refactored to accept offset/limit/filters/sort and returns aggregations (tab counts, totals, status counts) in a single optimized SQL query. Frontend removes all client-side filtering and displays server-provided data directly. A dedicated `/documents/export` endpoint handles CSV/XLSX export without pagination limits.

**Tech Stack:** Python/FastAPI/SQLAlchemy (backend), React/TypeScript/TanStack Query + Table/Zustand/Tailwind (frontend)

---

## File Structure

### Backend (C:\pdf-extractor)

| File | Action | Responsibility |
|------|--------|----------------|
| `app/routers/data_router.py` | **Modify** | Refactor GET /documents + add GET /documents/export |
| `scripts/migrate_categorie.py` | **Create** | One-shot script to fill NULL categorie_fournisseur |
| `scripts/add_indexes.py` | **Create** | Script to add performance indexes |

### Frontend (C:\frontend_opus)

| File | Action | Responsibility |
|------|--------|----------------|
| `src/types/index.ts` | **Modify** | Add ServerPaginatedResponse, DocumentAggregations types |
| `src/stores/filterStore.ts` | **Modify** | Add page, perPage, sortBy, sortOrder + reset logic |
| `src/services/documents.ts` | **Modify** | Adapt getAll() for server params + add exportAll() |
| `src/components/common/Pagination.tsx` | **Create** | Pagination UI component |
| `src/pages/Extractions.tsx` | **Modify** | Remove client filtering, use server aggregations + pagination |
| `src/components/extractions/ExtractionsTable.tsx` | **Modify** | Server-side sorting integration |
| `src/components/filters/DocumentFilters.tsx` | **Modify** | Debounce search + reset page on filter change |
| `src/components/layout/TypeTabs.tsx` | **Modify** | Accept aggregation counts |

---

### Task 1: Migration script — Fill NULL categorie_fournisseur

**Files:**
- Create: `C:\pdf-extractor\scripts\migrate_categorie.py`

- [ ] **Step 1: Create the migration script**

```python
# scripts/migrate_categorie.py
"""
One-shot migration: fill NULL categorie_fournisseur based on fournisseur name.
Run BEFORE deploying server-side pagination filters.

Usage: python scripts/migrate_categorie.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings

GROSSISTES = ['OCP', 'STRAIGHT', 'ACTIVE-REPARTITION', 'D2P', 'AREDIS', 'ACTIVE REPARTITION']

def migrate():
    engine = create_engine(settings.DATABASE_URL)
    with engine.begin() as conn:
        # Get documents with NULL categorie
        result = conn.execute(text(
            "SELECT id, fournisseur FROM documents WHERE categorie_fournisseur IS NULL"
        ))
        rows = result.fetchall()
        print(f"Found {len(rows)} documents with NULL categorie_fournisseur")

        updated = 0
        for doc_id, fournisseur in rows:
            if not fournisseur:
                categorie = 'LABO'
            else:
                normalized = fournisseur.upper().strip()
                categorie = 'GROSSISTE' if any(
                    g in normalized or normalized in g for g in GROSSISTES
                ) else 'LABO'

            conn.execute(text(
                "UPDATE documents SET categorie_fournisseur = :cat WHERE id = :id"
            ), {"cat": categorie, "id": doc_id})
            updated += 1

        print(f"Updated {updated} documents")

if __name__ == "__main__":
    migrate()
```

- [ ] **Step 2: Run the migration**

Run: `cd /c/pdf-extractor && python scripts/migrate_categorie.py`

Expected: "Found 42 documents with NULL categorie_fournisseur" + "Updated 42 documents"

- [ ] **Step 3: Verify no NULL remain**

Run: `cd /c/pdf-extractor && python -c "from sqlalchemy import create_engine, text; from app.config import settings; e = create_engine(settings.DATABASE_URL); r = e.execute(text('SELECT COUNT(*) FROM documents WHERE categorie_fournisseur IS NULL')); print(f'NULL count: {r.scalar()}')"`

Expected: `NULL count: 0`

- [ ] **Step 4: Commit**

```bash
cd /c/pdf-extractor
git add scripts/migrate_categorie.py
git commit -m "feat: migration script to fill NULL categorie_fournisseur"
```

---

### Task 2: Add database indexes

**Files:**
- Create: `C:\pdf-extractor\scripts\add_indexes.py`

- [ ] **Step 1: Create the index script**

```python
# scripts/add_indexes.py
"""
Add performance indexes for server-side pagination queries.
Safe to run multiple times (IF NOT EXISTS).

Usage: python scripts/add_indexes.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings

INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status)",
    "CREATE INDEX IF NOT EXISTS idx_documents_categorie ON documents(categorie_fournisseur)",
    "CREATE INDEX IF NOT EXISTS idx_documents_fournisseur ON documents(fournisseur)",
    "CREATE INDEX IF NOT EXISTS idx_documents_date_extraction ON documents(date_extraction DESC)",
    "CREATE INDEX IF NOT EXISTS idx_documents_date_document ON documents(date_document DESC)",
    "CREATE INDEX IF NOT EXISTS idx_extractions_document_id ON extractions(document_id)",
]

def add_indexes():
    engine = create_engine(settings.DATABASE_URL)
    with engine.begin() as conn:
        for idx_sql in INDEXES:
            idx_name = idx_sql.split("IF NOT EXISTS ")[1].split(" ON")[0]
            print(f"Creating index: {idx_name}...")
            conn.execute(text(idx_sql))
            print(f"  -> OK")

    print(f"\nAll {len(INDEXES)} indexes created/verified")

if __name__ == "__main__":
    add_indexes()
```

- [ ] **Step 2: Run the index script**

Run: `cd /c/pdf-extractor && python scripts/add_indexes.py`

Expected: All 6 indexes created or already exist.

- [ ] **Step 3: Commit**

```bash
cd /c/pdf-extractor
git add scripts/add_indexes.py
git commit -m "feat: add performance indexes for pagination queries"
```

---

### Task 3: Refactor backend GET /documents endpoint

**Files:**
- Modify: `C:\pdf-extractor\app\routers\data_router.py:122-221`

- [ ] **Step 1: Add the sort column whitelist and helper**

At the top of `data_router.py` (after imports), add:

```python
from sqlalchemy import func, case, nullslast
from sqlalchemy.sql import label

# Whitelist of allowed sort columns (prevents SQL injection via sort_by)
SORT_COLUMNS = {
    "date_extraction": Document.date_extraction,
    "date_document": Document.date_document,
    "net_a_payer": Document.net_a_payer,
    "fournisseur": Document.fournisseur,
    "numero_facture": Document.numero_facture,
    "confidence_score": Document.confidence_score,
    "status": Document.status,
    "nom_fichier": Document.nom_fichier,
}

# Columns that can contain NULL — need NULLS LAST in ORDER BY
NULLABLE_SORT_COLUMNS = {"date_document", "net_a_payer", "numero_facture"}
```

- [ ] **Step 2: Replace the GET /documents endpoint**

Replace the entire `get_documents` function (lines 122-221) with:

```python
@router.get("/documents")
def get_documents(
    offset: int = 0,
    limit: int = 50,
    categorie_fournisseur: str = None,
    fournisseur: str = None,
    status: str = None,
    search: str = None,
    template: str = None,
    sort_by: str = "date_extraction",
    sort_order: str = "desc",
    db: Session = Depends(get_db)
):
    """
    Récupère la liste des documents avec pagination serveur, filtres et agrégations.

    Args:
        offset: Position de départ (défaut: 0)
        limit: Nombre par page (défaut: 50, max: 200)
        categorie_fournisseur: Filtre GROSSISTE ou LABO
        fournisseur: Filtre par nom fournisseur exact
        status: Filtre par statut (VALIDATED, NEEDS_REVIEW, etc.)
        search: Recherche globale dans toutes les colonnes
        template: Filtre par template utilisé
        sort_by: Colonne de tri (défaut: date_extraction)
        sort_order: Ordre de tri: asc ou desc (défaut: desc)
    """
    import json as json_lib

    # Clamp limit
    limit = min(max(limit, 1), 200)
    offset = max(offset, 0)

    # Validate sort
    sort_column = SORT_COLUMNS.get(sort_by, Document.date_extraction)
    if sort_order not in ("asc", "desc"):
        sort_order = "desc"

    # --- Build base filter (WITHOUT categorie_fournisseur) ---
    base_conditions = []

    if fournisseur:
        base_conditions.append(Document.fournisseur == fournisseur)
    if status:
        base_conditions.append(Document.status == status)
    if template:
        base_conditions.append(Document.template_used == template)
    if search:
        search_pattern = f"%{search}%"
        base_conditions.append(or_(
            Document.nom_fichier.ilike(search_pattern),
            Document.numero_facture.ilike(search_pattern),
            Document.fournisseur.ilike(search_pattern),
            Document.type_document.ilike(search_pattern),
            Document.status.ilike(search_pattern),
            Document.template_used.ilike(search_pattern),
            Document.operateur.ilike(search_pattern),
            Document.categorie_fournisseur.ilike(search_pattern),
            cast(Document.net_a_payer, String).ilike(search_pattern),
        ))

    # --- Aggregations (single query, WITHOUT categorie filter) ---
    agg_query = db.query(
        # Tab counts (always show both tabs with correct counts)
        func.count().filter(Document.categorie_fournisseur == 'GROSSISTE').label('count_grossiste'),
        func.count().filter(Document.categorie_fournisseur == 'LABO').label('count_labo'),
        # Status counts
        func.count().filter(Document.status == 'VALIDATED').label('count_validated'),
        func.count().filter(Document.status == 'NEEDS_REVIEW').label('count_needs_review'),
        func.count().filter(Document.status == 'AUTO_PROCESSED').label('count_auto'),
        func.count().filter(Document.status == 'FAILED').label('count_failed'),
        # Totals
        func.coalesce(func.sum(Document.base_ht_tva_20), 0).label('total_ht'),
        func.coalesce(func.sum(Document.net_a_payer), 0).label('total_ttc'),
    )
    for cond in base_conditions:
        agg_query = agg_query.filter(cond)

    agg = agg_query.one()

    # --- Main query (WITH categorie filter) ---
    # Subquery for extraction_count to avoid N+1
    extraction_count_sq = (
        db.query(
            Extraction.document_id,
            func.count(Extraction.id).label('ext_count')
        )
        .group_by(Extraction.document_id)
        .subquery()
    )

    query = (
        db.query(Document, extraction_count_sq.c.ext_count)
        .outerjoin(extraction_count_sq, Document.id == extraction_count_sq.c.document_id)
    )

    # Apply base filters
    for cond in base_conditions:
        query = query.filter(cond)

    # Apply categorie filter (only for main query, NOT aggregations)
    if categorie_fournisseur:
        query = query.filter(Document.categorie_fournisseur == categorie_fournisseur)

    # Total count (with all filters including categorie)
    total_count = query.count()

    # Sort
    if sort_order == "asc":
        order = sort_column.asc()
    else:
        order = sort_column.desc()

    if sort_by in NULLABLE_SORT_COLUMNS:
        order = nullslast(order)

    query = query.order_by(order)

    # Paginate
    results = query.offset(offset).limit(limit).all()

    def parse_review_reasons(reasons_str):
        if not reasons_str:
            return []
        try:
            return json_lib.loads(reasons_str)
        except:
            return []

    # Unique fournisseurs for the current categorie (for filter dropdown)
    fournisseur_query = db.query(Document.fournisseur).distinct()
    for cond in base_conditions:
        fournisseur_query = fournisseur_query.filter(cond)
    if categorie_fournisseur:
        fournisseur_query = fournisseur_query.filter(
            Document.categorie_fournisseur == categorie_fournisseur
        )
    fournisseurs_list = sorted([
        r[0] for r in fournisseur_query.all() if r[0]
    ])

    return {
        "total_count": total_count,
        "offset": offset,
        "limit": limit,
        "fournisseurs": fournisseurs_list,
        "documents": [
            {
                "id": doc.id,
                "nom_fichier": doc.nom_fichier,
                "date_extraction": doc.date_extraction.isoformat(),
                "date_derniere_modification": doc.date_derniere_modification.isoformat(),
                "net_a_payer": float(doc.net_a_payer) if doc.net_a_payer else None,
                "numero_facture": doc.numero_facture,
                "date_document": doc.date_document.isoformat() if doc.date_document else None,
                "date_echeance": doc.date_echeance.isoformat() if doc.date_echeance else None,
                "status": doc.status,
                "confidence_score": doc.confidence_score,
                "review_reasons": parse_review_reasons(doc.review_reasons),
                "extraction_count": ext_count or 0,
                "fournisseur": doc.fournisseur,
                "type_document": doc.type_document,
                "template_used": doc.template_used,
                "categorie_fournisseur": doc.categorie_fournisseur,
                "operateur": doc.operateur,
                "heure_document": doc.heure_document,
                "base_ht_tva_2_1": float(doc.base_ht_tva_2_1) if doc.base_ht_tva_2_1 else None,
                "base_ht_tva_5_5": float(doc.base_ht_tva_5_5) if doc.base_ht_tva_5_5 else None,
                "base_ht_tva_10": float(doc.base_ht_tva_10) if doc.base_ht_tva_10 else None,
                "base_ht_tva_20": float(doc.base_ht_tva_20) if doc.base_ht_tva_20 else None,
                "total_tva_2_1": float(doc.total_tva_2_1) if doc.total_tva_2_1 else None,
                "total_tva_5_5": float(doc.total_tva_5_5) if doc.total_tva_5_5 else None,
                "total_tva_10": float(doc.total_tva_10) if doc.total_tva_10 else None,
                "total_tva_20": float(doc.total_tva_20) if doc.total_tva_20 else None,
            }
            for doc, ext_count in results
        ],
        "aggregations": {
            "by_categorie": {
                "GROSSISTE": agg.count_grossiste or 0,
                "LABO": agg.count_labo or 0,
            },
            "by_status": {
                "VALIDATED": agg.count_validated or 0,
                "NEEDS_REVIEW": agg.count_needs_review or 0,
                "AUTO_PROCESSED": agg.count_auto or 0,
                "FAILED": agg.count_failed or 0,
            },
            "totals": {
                "total_ht": float(agg.total_ht),
                "total_ttc": float(agg.total_ttc),
            }
        }
    }
```

- [ ] **Step 3: Verify imports are present**

Make sure these imports exist at the top of `data_router.py`:

```python
from sqlalchemy import func, case, or_, cast, String
from sqlalchemy.sql import nullslast
from app.models import Document, Extraction
```

- [ ] **Step 4: Test the endpoint manually**

Run: `curl "http://localhost:8000/documents?limit=5&categorie_fournisseur=GROSSISTE&sort_by=date_extraction&sort_order=desc" | python -m json.tool | head -30`

Expected: Response with `total_count`, `aggregations`, and 5 documents.

- [ ] **Step 5: Commit**

```bash
cd /c/pdf-extractor
git add app/routers/data_router.py
git commit -m "feat: refactor GET /documents with server-side pagination, filters, aggregations"
```

---

### Task 4: Add GET /documents/export endpoint

**Files:**
- Modify: `C:\pdf-extractor\app\routers\data_router.py`

- [ ] **Step 1: Add export endpoint after get_documents**

```python
@router.get("/documents/export")
def export_documents(
    categorie_fournisseur: str = None,
    fournisseur: str = None,
    status: str = None,
    search: str = None,
    template: str = None,
    sort_by: str = "date_extraction",
    sort_order: str = "desc",
    db: Session = Depends(get_db)
):
    """
    Export all documents matching filters (no pagination limit).
    Used by CSV/XLSX export buttons.
    """
    import json as json_lib

    sort_column = SORT_COLUMNS.get(sort_by, Document.date_extraction)
    if sort_order not in ("asc", "desc"):
        sort_order = "desc"

    # Build filters
    query = db.query(Document)

    if categorie_fournisseur:
        query = query.filter(Document.categorie_fournisseur == categorie_fournisseur)
    if fournisseur:
        query = query.filter(Document.fournisseur == fournisseur)
    if status:
        query = query.filter(Document.status == status)
    if template:
        query = query.filter(Document.template_used == template)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(or_(
            Document.nom_fichier.ilike(search_pattern),
            Document.numero_facture.ilike(search_pattern),
            Document.fournisseur.ilike(search_pattern),
            Document.type_document.ilike(search_pattern),
            cast(Document.net_a_payer, String).ilike(search_pattern),
        ))

    # Sort
    if sort_order == "asc":
        order = sort_column.asc()
    else:
        order = sort_column.desc()
    if sort_by in NULLABLE_SORT_COLUMNS:
        order = nullslast(order)

    documents = query.order_by(order).all()

    def parse_review_reasons(reasons_str):
        if not reasons_str:
            return []
        try:
            return json_lib.loads(reasons_str)
        except:
            return []

    return {
        "count": len(documents),
        "documents": [
            {
                "id": doc.id,
                "nom_fichier": doc.nom_fichier,
                "date_extraction": doc.date_extraction.isoformat(),
                "net_a_payer": float(doc.net_a_payer) if doc.net_a_payer else None,
                "numero_facture": doc.numero_facture,
                "date_document": doc.date_document.isoformat() if doc.date_document else None,
                "status": doc.status,
                "fournisseur": doc.fournisseur,
                "categorie_fournisseur": doc.categorie_fournisseur,
                "type_document": doc.type_document,
                "template_used": doc.template_used,
                "base_ht_tva_2_1": float(doc.base_ht_tva_2_1) if doc.base_ht_tva_2_1 else None,
                "base_ht_tva_5_5": float(doc.base_ht_tva_5_5) if doc.base_ht_tva_5_5 else None,
                "base_ht_tva_10": float(doc.base_ht_tva_10) if doc.base_ht_tva_10 else None,
                "base_ht_tva_20": float(doc.base_ht_tva_20) if doc.base_ht_tva_20 else None,
                "total_tva_2_1": float(doc.total_tva_2_1) if doc.total_tva_2_1 else None,
                "total_tva_5_5": float(doc.total_tva_5_5) if doc.total_tva_5_5 else None,
                "total_tva_10": float(doc.total_tva_10) if doc.total_tva_10 else None,
                "total_tva_20": float(doc.total_tva_20) if doc.total_tva_20 else None,
            }
            for doc in documents
        ]
    }
```

- [ ] **Step 2: Test the export endpoint**

Run: `curl "http://localhost:8000/documents/export?categorie_fournisseur=GROSSISTE" | python -m json.tool | head -5`

Expected: Response with `count` equal to total GROSSISTE documents (no pagination).

- [ ] **Step 3: Commit**

```bash
cd /c/pdf-extractor
git add app/routers/data_router.py
git commit -m "feat: add GET /documents/export endpoint (no pagination limit)"
```

---

### Task 5: Frontend types — Add server pagination response types

**Files:**
- Modify: `C:\frontend_opus\src\types\index.ts`

- [ ] **Step 1: Add new types**

Add after the existing `PaginatedResponse` interface (around line 219):

```typescript
// Server Pagination Response (from GET /documents)
export interface DocumentAggregations {
  by_categorie: {
    GROSSISTE: number
    LABO: number
  }
  by_status: {
    VALIDATED: number
    NEEDS_REVIEW: number
    AUTO_PROCESSED: number
    FAILED: number
  }
  totals: {
    total_ht: number
    total_ttc: number
  }
}

export interface ServerDocumentsResponse {
  total_count: number
  offset: number
  limit: number
  fournisseurs: string[]
  documents: Document[]
  aggregations: DocumentAggregations
}

export interface ServerExportResponse {
  count: number
  documents: Document[]
}
```

- [ ] **Step 2: Commit**

```bash
cd /c/frontend_opus
git add src/types/index.ts
git commit -m "feat: add server pagination response types"
```

---

### Task 6: Update filterStore — Add pagination and sort state

**Files:**
- Modify: `C:\frontend_opus\src\stores\filterStore.ts`

- [ ] **Step 1: Add page, perPage, sortBy, sortOrder to the store**

Replace the entire content of `filterStore.ts`:

```typescript
import { create } from 'zustand'
import type { FournisseurType, FilterState } from '@/types'

interface FilterStoreState {
  activeType: FournisseurType
  selectedFournisseur: string | null
  filters: FilterState
  searchTerm: string
  sqlMode: boolean
  sqlQuery: string
  // Pagination
  page: number
  perPage: number
  // Sorting
  sortBy: string
  sortOrder: 'asc' | 'desc'
  // Actions
  setActiveType: (type: FournisseurType) => void
  setSelectedFournisseur: (fournisseur: string | null) => void
  setFilters: (filters: Partial<FilterState>) => void
  setSearchTerm: (term: string) => void
  setSqlMode: (mode: boolean) => void
  setSqlQuery: (query: string) => void
  setPage: (page: number) => void
  setPerPage: (perPage: number) => void
  setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void
  resetFilters: () => void
}

const defaultFilters: FilterState = {
  fournisseur: undefined,
  dateRange: undefined,
  status: undefined,
  confidence: undefined,
  designation: undefined,
  codeArticle: undefined,
  tauxTva: undefined,
  montantMin: undefined,
  montantMax: undefined,
}

export const useFilterStore = create<FilterStoreState>((set) => ({
  activeType: 'GROSSISTE',
  selectedFournisseur: null,
  filters: defaultFilters,
  searchTerm: '',
  sqlMode: false,
  sqlQuery: '',
  page: 1,
  perPage: 50,
  sortBy: 'date_extraction',
  sortOrder: 'desc',

  setActiveType: (type) => set({ activeType: type, selectedFournisseur: null, page: 1 }),
  setSelectedFournisseur: (fournisseur) => set({ selectedFournisseur: fournisseur, page: 1 }),
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters },
    page: 1,
  })),
  setSearchTerm: (term) => set({ searchTerm: term, page: 1 }),
  setSqlMode: (mode) => set({ sqlMode: mode }),
  setSqlQuery: (query) => set({ sqlQuery: query }),
  setPage: (page) => set({ page }),
  setPerPage: (perPage) => set({ perPage, page: 1 }),
  setSort: (sortBy, sortOrder) => set({ sortBy, sortOrder, page: 1 }),
  resetFilters: () => set({
    filters: defaultFilters,
    searchTerm: '',
    sqlQuery: '',
    selectedFournisseur: null,
    page: 1,
  }),
}))
```

- [ ] **Step 2: Commit**

```bash
cd /c/frontend_opus
git add src/stores/filterStore.ts
git commit -m "feat: add pagination and sort state to filterStore"
```

---

### Task 7: Update documents service — Server-side params

**Files:**
- Modify: `C:\frontend_opus\src\services\documents.ts`

- [ ] **Step 1: Rewrite the documents service**

Replace the entire content of `documents.ts`:

```typescript
import api from './api'
import type { Document, ServerDocumentsResponse, ServerExportResponse } from '@/types'

interface DocumentsParams {
  offset?: number
  limit?: number
  categorie_fournisseur?: string
  fournisseur?: string
  status?: string
  search?: string
  template?: string
  sort_by?: string
  sort_order?: string
}

export const documentsService = {
  getAll: async (params: DocumentsParams = {}): Promise<ServerDocumentsResponse> => {
    const { data } = await api.get<ServerDocumentsResponse>('/documents', { params })
    return data
  },

  exportAll: async (params: Omit<DocumentsParams, 'offset' | 'limit'>): Promise<ServerExportResponse> => {
    const { data } = await api.get<ServerExportResponse>('/documents/export', { params })
    return data
  },

  getById: async (id: number): Promise<Document> => {
    const { data } = await api.get<ServerDocumentsResponse>('/documents', {
      params: { search: String(id), limit: 10 }
    })
    const doc = data.documents?.find(d => d.id === id)
    if (!doc) throw new Error('Document not found')
    return doc
  },

  getPdfUrl: (id: number): string => {
    return `${api.defaults.baseURL}/documents/${id}/pdf?doc=${id}`
  },

  getPdf: async (id: number): Promise<Blob> => {
    const { data } = await api.get(`/documents/${id}/pdf`, {
      responseType: 'blob'
    })
    return data
  },

  validate: async (id: number): Promise<Document> => {
    const { data } = await api.post(`/documents/${id}/validate`)
    return data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/documents/${id}`)
  },

  updateExtractions: async (
    id: number,
    corrections: { id: number; [key: string]: unknown }[]
  ): Promise<Document> => {
    const { data } = await api.patch(`/documents/${id}/extractions`, { corrections })
    return data
  },

  search: async (query: string): Promise<Document[]> => {
    const { data } = await api.get<ServerDocumentsResponse>('/documents', {
      params: { search: query, limit: 50 }
    })
    return data.documents || []
  },
}
```

- [ ] **Step 2: Commit**

```bash
cd /c/frontend_opus
git add src/services/documents.ts
git commit -m "feat: update documents service for server-side pagination"
```

---

### Task 8: Create Pagination component

**Files:**
- Create: `C:\frontend_opus\src\components\common\Pagination.tsx`

- [ ] **Step 1: Create the Pagination component**

```tsx
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  page: number
  perPage: number
  totalCount: number
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
}

export function Pagination({ page, perPage, totalCount, onPageChange, onPerPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage))
  const start = Math.min((page - 1) * perPage + 1, totalCount)
  const end = Math.min(page * perPage, totalCount)

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
      {/* Left: rows info */}
      <div className="text-sm text-gray-500">
        {totalCount > 0 ? (
          <>
            <span className="font-medium text-gray-700">{start}</span>
            {' - '}
            <span className="font-medium text-gray-700">{end}</span>
            {' sur '}
            <span className="font-medium text-gray-700">{totalCount.toLocaleString('fr-FR')}</span>
            {' documents'}
          </>
        ) : (
          'Aucun document'
        )}
      </div>

      {/* Center: page navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="Première page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="Page précédente"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="px-3 text-sm text-gray-700">
          Page <span className="font-medium">{page}</span> sur <span className="font-medium">{totalPages}</span>
        </span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="Page suivante"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="Dernière page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>

      {/* Right: per page selector */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>Par page :</span>
        <select
          value={perPage}
          onChange={(e) => onPerPageChange(Number(e.target.value))}
          className="px-2 py-1 bg-white border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd /c/frontend_opus
git add src/components/common/Pagination.tsx
git commit -m "feat: create Pagination component"
```

---

### Task 9: Rewrite Extractions page — Server-side everything

**Files:**
- Modify: `C:\frontend_opus\src\pages\Extractions.tsx`

- [ ] **Step 1: Rewrite the Extractions page**

Replace the entire content of `Extractions.tsx`:

```tsx
import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TypeTabs } from '@/components/layout/TypeTabs'
import { DocumentFilters } from '@/components/filters/DocumentFilters'
import { ExtractionsTable } from '@/components/extractions/ExtractionsTable'
import { ExtractionDrawer } from '@/components/extractions/ExtractionDrawer'
import { Pagination } from '@/components/common/Pagination'
import { useUIStore } from '@/stores/uiStore'
import { useFilterStore } from '@/stores/filterStore'
import { documentsService } from '@/services/documents'
import { extractionsService } from '@/services/extractions'
import { formatCurrency } from '@/lib/utils'
import { Download, Plus, LayoutList, FileText, Loader2 } from 'lucide-react'
import { useExport } from '@/hooks/useExport'

type ViewMode = 'documents' | 'lines'

export function Extractions() {
  const { drawerOpen, selectedId } = useUIStore()
  const {
    activeType, selectedFournisseur, searchTerm, filters,
    page, perPage, sortBy, sortOrder,
    setPage, setPerPage,
  } = useFilterStore()
  const [viewMode, setViewMode] = useState<ViewMode>('documents')
  const { exportToXLSX, exportToCSV } = useExport()

  // Build query params from store state
  const queryParams = {
    offset: (page - 1) * perPage,
    limit: perPage,
    categorie_fournisseur: activeType,
    fournisseur: selectedFournisseur || undefined,
    status: filters.status?.[0] || undefined,
    search: searchTerm || undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
  }

  // Fetch documents from API (server-side pagination)
  const { data: serverResponse, isLoading: loadingDocs } = useQuery({
    queryKey: ['documents', queryParams],
    queryFn: () => documentsService.getAll(queryParams),
    placeholderData: (prev) => prev,
  })

  // Fetch extractions for lines view
  const { data: extractionsData, isLoading: loadingExtractions } = useQuery({
    queryKey: ['extractions', { limit: 1000 }],
    queryFn: () => extractionsService.getAll({ limit: 1000 }),
    enabled: viewMode === 'lines',
  })

  const documents = serverResponse?.documents || []
  const totalCount = serverResponse?.total_count || 0
  const aggregations = serverResponse?.aggregations
  const fournisseurs = serverResponse?.fournisseurs || []
  const allExtractions = extractionsData?.items || []

  // Tab counts from server aggregations
  const counts = {
    GROSSISTE: aggregations?.by_categorie?.GROSSISTE ?? 0,
    LABO: aggregations?.by_categorie?.LABO ?? 0,
  }

  // Totals from server aggregations
  const totals = {
    count: totalCount,
    ht: aggregations?.totals?.total_ht ?? 0,
    ttc: aggregations?.totals?.total_ttc ?? 0,
  }

  // Selected document
  const selectedDocument = documents.find((d) => d.id === selectedId) || null

  // Export handlers (use dedicated export endpoint)
  const handleExportCSV = useCallback(async () => {
    if (viewMode === 'documents') {
      const exportData = await documentsService.exportAll({
        categorie_fournisseur: activeType,
        fournisseur: selectedFournisseur || undefined,
        status: filters.status?.[0] || undefined,
        search: searchTerm || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      })
      exportToCSV(exportData.documents as unknown as Record<string, unknown>[], 'documents_export')
    } else {
      exportToCSV(allExtractions as unknown as Record<string, unknown>[], 'extractions_export')
    }
  }, [viewMode, activeType, selectedFournisseur, filters, searchTerm, sortBy, sortOrder, allExtractions, exportToCSV])

  const handleExportXLSX = useCallback(async () => {
    if (viewMode === 'documents') {
      const exportData = await documentsService.exportAll({
        categorie_fournisseur: activeType,
        fournisseur: selectedFournisseur || undefined,
        status: filters.status?.[0] || undefined,
        search: searchTerm || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      })
      exportToXLSX(exportData.documents as unknown as Record<string, unknown>[], 'documents_export')
    } else {
      exportToXLSX(allExtractions as unknown as Record<string, unknown>[], 'extractions_export')
    }
  }, [viewMode, activeType, selectedFournisseur, filters, searchTerm, sortBy, sortOrder, allExtractions, exportToXLSX])

  const isLoading = loadingDocs || (viewMode === 'lines' && loadingExtractions)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* KPI Bar */}
      <div className="bg-white px-6 py-3 border-b border-gray-200 flex gap-6 items-center overflow-x-auto shrink-0 shadow-sm z-10">
        <TypeTabs counts={counts} />

        <div className="w-px h-8 bg-gray-200" />

        {/* View Mode Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('documents')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
              viewMode === 'documents'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            Documents
          </button>
          <button
            onClick={() => setViewMode('lines')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
              viewMode === 'lines'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LayoutList className="w-4 h-4" />
            Lignes
          </button>
        </div>

        <div className="w-px h-8 bg-gray-200" />

        <div className="flex flex-col">
          <span className="text-xs text-gray-400 uppercase font-semibold">
            {viewMode === 'documents' ? 'Documents' : 'Lignes extraites'}
          </span>
          <span className="text-lg font-bold text-gray-800">
            {isLoading ? '...' : viewMode === 'documents' ? totals.count.toLocaleString('fr-FR') : allExtractions.length}
          </span>
        </div>
        <div className="w-px h-8 bg-gray-100" />
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 uppercase font-semibold">Total HT (filtré)</span>
          <span className="text-lg font-bold text-gray-800">{formatCurrency(totals.ht)}</span>
        </div>
        <div className="w-px h-8 bg-gray-100" />
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 uppercase font-semibold">Total TTC (filtré)</span>
          <span className="text-lg font-bold text-blue-600">{formatCurrency(totals.ttc)}</span>
        </div>

        <div className="flex-grow" />

        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded text-sm font-medium text-gray-600 hover:bg-gray-50 transition shadow-sm whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            onClick={handleExportXLSX}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded text-sm font-medium text-gray-600 hover:bg-gray-50 transition shadow-sm whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">XLSX</span>
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 border border-blue-600 rounded text-sm font-medium text-white hover:bg-blue-700 transition shadow-sm whitespace-nowrap">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nouvelle</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <DocumentFilters fournisseurs={fournisseurs} />

      {/* Split View: Table + Drawer */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        <div
          className={`flex-1 overflow-auto bg-gray-50 custom-scrollbar transition-all duration-300 ease-in-out ${
            drawerOpen ? 'mr-[420px]' : 'mr-0'
          }`}
        >
          <div className="px-6 pb-6 pt-0 w-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-3 text-gray-500">Chargement...</span>
              </div>
            ) : viewMode === 'documents' ? (
              <ExtractionsTable data={documents} />
            ) : (
              <ExtractionsTable data={documents} extractions={allExtractions} viewMode="lines" />
            )}
          </div>
        </div>

        {/* Pagination (documents view only) */}
        {viewMode === 'documents' && !isLoading && totalCount > 0 && (
          <Pagination
            page={page}
            perPage={perPage}
            totalCount={totalCount}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
          />
        )}

        {/* Drawer */}
        <ExtractionDrawer document={selectedDocument} isOpen={drawerOpen} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify app compiles**

Run: `cd /c/frontend_opus && npx tsc --noEmit 2>&1 | head -20`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd /c/frontend_opus
git add src/pages/Extractions.tsx
git commit -m "feat: rewrite Extractions page with server-side pagination and aggregations"
```

---

### Task 10: Update DocumentFilters — Debounce search + reset page

**Files:**
- Modify: `C:\frontend_opus\src\components\filters\DocumentFilters.tsx`

- [ ] **Step 1: Add debounced search**

Replace the search input section in `DocumentFilters.tsx`. Add a local state for the input value and debounce it:

At the top, add:
```tsx
import { useState, useEffect } from 'react'
```

Inside the component, before the `return`:
```tsx
  const [localSearch, setLocalSearch] = useState(searchTerm)

  // Debounce search term — 400ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchTerm) {
        setSearchTerm(localSearch)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [localSearch, searchTerm, setSearchTerm])

  // Sync local state when store resets
  useEffect(() => {
    if (searchTerm === '' && localSearch !== '') {
      setLocalSearch('')
    }
  }, [searchTerm])
```

Replace the input `value` and `onChange`:
```tsx
value={localSearch}
onChange={(e) => setLocalSearch(e.target.value)}
```

And update the search chip reset:
```tsx
<button onClick={() => { setLocalSearch(''); setSearchTerm('') }}>
```

- [ ] **Step 2: Commit**

```bash
cd /c/frontend_opus
git add src/components/filters/DocumentFilters.tsx
git commit -m "feat: debounce search input (400ms) + reset page on filter change"
```

---

### Task 11: Server-side sorting in ExtractionsTable

**Files:**
- Modify: `C:\frontend_opus\src\components\extractions\ExtractionsTable.tsx`

- [ ] **Step 1: Connect TanStack Table sorting to the store**

In `ExtractionsTable.tsx`, import the store and connect sorting:

Add import:
```tsx
import { useFilterStore } from '@/stores/filterStore'
```

Inside the component, replace the `sorting` state:
```tsx
const { sortBy, sortOrder, setSort } = useFilterStore()

// Convert store sort to TanStack SortingState
const sorting: SortingState = sortBy
  ? [{ id: sortBy, desc: sortOrder === 'desc' }]
  : []

const handleSortingChange = (updater: any) => {
  const newSorting = typeof updater === 'function' ? updater(sorting) : updater
  if (newSorting.length > 0) {
    setSort(newSorting[0].id, newSorting[0].desc ? 'desc' : 'asc')
  } else {
    setSort('date_extraction', 'desc')
  }
}
```

Remove the old `useState<SortingState>([])` line.

In the `useReactTable` config, set `manualSorting: true`:
```tsx
const table = useReactTable({
  data,
  columns,
  state: { sorting },
  onSortingChange: handleSortingChange,
  manualSorting: true,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
})
```

- [ ] **Step 2: Commit**

```bash
cd /c/frontend_opus
git add src/components/extractions/ExtractionsTable.tsx
git commit -m "feat: connect table sorting to server-side sort via store"
```

---

### Task 12: Final integration test + cleanup

- [ ] **Step 1: Rebuild backend container**

Run: `cd /c/pdf-extractor && docker compose up -d --build api`

- [ ] **Step 2: Start frontend dev server**

Run: `cd /c/frontend_opus && npm run dev`

- [ ] **Step 3: Verify pagination works**

1. Open the app in browser
2. GROSSISTE tab shows correct count
3. LABO tab shows correct count
4. Pagination controls appear at the bottom
5. Navigate to page 2 → different documents appear
6. Change "Par page" to 100 → page resets to 1, shows 100 docs

- [ ] **Step 4: Verify filters work**

1. Select a fournisseur → results filtered, page resets to 1
2. Select a status → results filtered
3. Type in search → results appear after 400ms debounce
4. Reset filters → everything cleared

- [ ] **Step 5: Verify sort works**

1. Click column header → data sorts server-side
2. Click again → toggles asc/desc

- [ ] **Step 6: Verify export works**

1. Click CSV → exports ALL matching documents (not just current page)
2. Click XLSX → same behavior

- [ ] **Step 7: Verify totals are correct**

1. HT/TTC totals match the aggregations, NOT just current page
2. Tab counts match total across all pages

- [ ] **Step 8: Final commit**

```bash
cd /c/frontend_opus
git add -A
git commit -m "feat: server-side pagination complete — all filters, sort, aggregations working"
```
