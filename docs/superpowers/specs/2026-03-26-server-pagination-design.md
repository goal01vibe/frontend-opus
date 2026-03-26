# Design Spec: Pagination Serveur — Documents

**Date:** 2026-03-26
**Scope:** Backend (pdf-extractor) + Frontend (frontend_opus)

## Objectif

Remplacer le chargement client-side (limit=500, filtrage JS) par une vraie pagination serveur avec filtres SQL, tri, agrégations en temps réel, et export dédié. Fondation nécessaire pour la future page de requêtes business (remises arrière, filtrage catégorie/prix/période).

## Problème actuel

1. **Limite arbitraire** : `limit: 500` dans `Extractions.tsx` → seuls 458/2521 documents affichés
2. **Filtrage client-side** : tous les documents chargés en mémoire, filtrés en JS
3. **N+1 queries** : `len(doc.extractions)` exécute 1 requête SQL par document
4. **Pas d'offset** : l'endpoint `GET /documents` n'a pas de paramètre `offset`
5. **Compteurs imprécis** : `count` retourne `len(documents)` (nb filtré), pas le total réel
6. **Pas de tri serveur** : le tri est fait côté client par TanStack Table

## Architecture

### Endpoint refactoré : `GET /documents`

**Nouveaux paramètres :**

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `offset` | int | 0 | Position de départ |
| `limit` | int | 50 | Nombre par page (max: 200) |
| `categorie_fournisseur` | string | null | `GROSSISTE` ou `LABO` |
| `fournisseur` | string | null | Nom exact du fournisseur |
| `status` | string | null | `VALIDATED`, `NEEDS_REVIEW`, etc. |
| `search` | string | null | Recherche globale (existant) |
| `template` | string | null | Template utilisé (existant) |
| `sort_by` | string | `date_extraction` | Colonne de tri |
| `sort_order` | string | `desc` | `asc` ou `desc` |

**Réponse enrichie :**

```json
{
  "total_count": 2521,
  "offset": 0,
  "limit": 50,
  "documents": [...],
  "aggregations": {
    "by_categorie": {
      "GROSSISTE": 1850,
      "LABO": 671
    },
    "by_status": {
      "VALIDATED": 1200,
      "NEEDS_REVIEW": 243,
      "AUTO_PROCESSED": 1050,
      "FAILED": 28
    },
    "totals": {
      "total_ht": 125430.50,
      "total_ttc": 150516.60
    }
  }
}
```

### Détails d'implémentation backend

**1. Agrégations en une seule requête SQL :**

Les compteurs par catégorie (`by_categorie`) sont calculés SANS le filtre `categorie_fournisseur`, pour que les deux onglets affichent toujours le bon nombre. Les compteurs `by_status` et `totals` appliquent TOUS les filtres sauf `categorie_fournisseur`.

```sql
SELECT
  COUNT(*) FILTER (WHERE categorie_fournisseur = 'GROSSISTE') AS count_grossiste,
  COUNT(*) FILTER (WHERE categorie_fournisseur = 'LABO') AS count_labo,
  COUNT(*) FILTER (WHERE status = 'VALIDATED') AS count_validated,
  ...
  SUM(COALESCE(base_ht_tva_20, 0)) AS total_ht,
  SUM(COALESCE(net_a_payer, 0)) AS total_ttc
FROM documents
WHERE [filtres SANS categorie_fournisseur]
```

**2. Fix N+1 : LEFT JOIN + COUNT + GROUP BY**

Remplacer `len(doc.extractions)` par une sous-requête :

```sql
SELECT d.*, COUNT(e.id) AS extraction_count
FROM documents d
LEFT JOIN extractions e ON e.document_id = d.id
WHERE ...
GROUP BY d.id
ORDER BY d.date_extraction DESC
OFFSET 0 LIMIT 50
```

**3. Whitelist de colonnes pour le tri (sécurité anti-injection SQL) :**

```python
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
```

**4. NULLS LAST :** Les colonnes nullable (date_document, net_a_payer) utilisent `nullslast()` pour pousser les NULL en fin de liste.

**5. Protection max limit :** `limit = min(limit, 200)` côté serveur.

### Nouvel endpoint : `GET /documents/export`

Export dédié sans pagination (pas d'offset/limit) pour CSV/XLSX. Applique les mêmes filtres que `GET /documents` mais retourne TOUS les résultats. Cet endpoint est utilisé par les boutons d'export existants.

### Migration données : categorie_fournisseur NULL

42 documents ont `categorie_fournisseur = NULL`. Script de migration pour remplir la catégorie basée sur le fournisseur (même logique que `deriveCategorieFromFournisseur` côté frontend). À exécuter AVANT le déploiement des filtres serveur.

### Index base de données

Nouveaux index pour optimiser les requêtes paginées :

```sql
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_categorie ON documents(categorie_fournisseur);
CREATE INDEX idx_documents_fournisseur ON documents(fournisseur);
CREATE INDEX idx_documents_date_extraction ON documents(date_extraction DESC);
CREATE INDEX idx_documents_date_document ON documents(date_document DESC);
```

## Frontend — Modifications

### 1. Store : ajout page/sort dans filterStore

Ajouter `page` (numéro de page courant) et `sortBy`/`sortOrder` au store. Reset `page` à 1 quand un filtre change.

### 2. Service documents.ts

- `getAll()` envoie offset, limit, tous les filtres, sort au serveur
- Retourne directement la réponse serveur (plus de mapping client-side pour categorie)
- Suppression de `deriveCategorieFromFournisseur` (migration serveur la remplace)
- Nouvel appel `exportAll()` vers `/documents/export`

### 3. Page Extractions.tsx

- Suppression de tout le filtrage client-side (`useMemo` + `.filter()`)
- Les données viennent directement du serveur, déjà filtrées/triées/paginées
- Compteurs onglets = `aggregations.by_categorie`
- Totaux HT/TTC = `aggregations.totals`
- Liste fournisseurs unique = nouveau champ dans la réponse serveur ou endpoint dédié

### 4. Composant Pagination

Nouveau composant `Pagination.tsx` avec :
- Navigation première/précédente/suivante/dernière page
- Affichage "Page X sur Y" et "documents X-Y sur Z"
- Sélecteur de nombre par page (25, 50, 100)

### 5. Tri serveur

Le tri dans `ExtractionsTable` (TanStack Table) déclenche un changement dans le store → nouvelle requête API au lieu d'un tri client-side.

### 6. Debounce recherche

Debounce de 400ms sur le champ de recherche pour éviter une requête à chaque frappe.

## Fichiers impactés

### Backend (pdf-extractor)

| Fichier | Action |
|---------|--------|
| `app/routers/data_router.py` | Refactorer `GET /documents` + ajouter `GET /documents/export` |
| `app/models.py` | Aucune modification |
| Migration Alembic | Créer index |
| `scripts/migrate_categorie.py` | Script one-shot pour NULL → GROSSISTE/LABO |

### Frontend (frontend_opus)

| Fichier | Action |
|---------|--------|
| `src/services/documents.ts` | Adapter getAll() + ajouter exportAll() |
| `src/pages/Extractions.tsx` | Supprimer filtrage client, utiliser agrégations serveur |
| `src/stores/filterStore.ts` | Ajouter page, sortBy, sortOrder, perPage |
| `src/components/Pagination.tsx` | **Créer** composant pagination |
| `src/components/extractions/ExtractionsTable.tsx` | Tri serveur au lieu de client |
| `src/components/filters/DocumentFilters.tsx` | Debounce + reset page |
| `src/components/layout/TypeTabs.tsx` | Props counts depuis aggregations |
| `src/types/index.ts` | Types pour réponse paginée enrichie |

## Hors scope

- Filtres avancés (date_from/date_to, confidence_min/max) — préparés dans les types mais pas implémentés maintenant
- Scroll infini (pagination classique choisie)
- Cache côté serveur (Redis)
- Vue "Lignes" (extractions) — garde le fonctionnement actuel, sera paginée plus tard
- Page de requêtes business (futur projet séparé)
