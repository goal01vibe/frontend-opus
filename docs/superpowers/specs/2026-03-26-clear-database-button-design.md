# Design Spec: Bouton "Vider la base" (mode DEV)

**Date:** 2026-03-26
**Scope:** Frontend uniquement — l'endpoint backend existe déjà

## Objectif

Ajouter un bouton dans le Header, visible uniquement en mode DEV (`devMode=true`), permettant de vider toutes les données de la base (documents + extractions) avec une confirmation modale avant suppression.

## Backend (existant — aucune modification)

- **Endpoint:** `DELETE /admin/clear-database?confirm=yes`
- **Fichier:** `app/routers/admin_router.py:375-436`
- **Comportement:** `TRUNCATE TABLE extractions, documents RESTART IDENTITY CASCADE`
- **Réponse:** `{ deleted: { documents: N, extractions: N }, sequences_reset: true }`

## Frontend — Modifications

### 1. Service `adminService` (admin.ts)

Ajouter une méthode :

```typescript
clearDatabase: async (): Promise<{ deleted: { documents: number; extractions: number } }> => {
  const { data } = await api.delete('/admin/clear-database', { params: { confirm: 'yes' } })
  return data
}
```

### 2. Header.tsx — Bouton icône conditionnel

**Emplacement:** Entre le badge BDPM et le FloatingExtractionModule, conditionné par `devMode`.

**Composant:** Bouton icône `Trash2` (lucide-react) avec style discret rouge.

```tsx
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

### 3. Dialog de confirmation

**Déclenchement:** `showClearDialog` state (useState local dans Header).

**Contenu de la modale:**
- **Titre:** "Vider la base de données"
- **Icône:** AlertTriangle (amber/rouge)
- **Message:** "Cette action supprimera **tous les documents et extractions**. Les IDs seront remis à zéro. Cette opération est **irréversible**."
- **Actions:**
  - Bouton "Annuler" → ferme la modale
  - Bouton "Supprimer tout" (rouge) → appelle `clearDatabase()` → affiche résultat

**Pendant l'appel API:**
- Bouton "Supprimer tout" affiche un spinner + "Suppression..."
- Bouton "Annuler" désactivé

**Après succès:**
- Fermer la modale
- Toast succès : "Base vidée : X documents et Y extractions supprimés"
- Invalider les queries React Query (`queryClient.invalidateQueries()`) pour refresh des données affichées

**Après erreur:**
- Toast erreur avec le message d'erreur
- Modale reste ouverte pour retry

### 4. Composant ClearDatabaseDialog

Créer un composant séparé `ClearDatabaseDialog.tsx` dans `components/layout/` pour garder le Header propre :

```
Props:
  - open: boolean
  - onClose: () => void
```

Ce composant encapsule toute la logique : appel API, states loading/error, invalidation queries, toast.

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/services/admin.ts` | Ajouter méthode `clearDatabase()` |
| `src/components/layout/Header.tsx` | Ajouter bouton + import dialog |
| `src/components/layout/ClearDatabaseDialog.tsx` | **Créer** — modale de confirmation |

## Hors scope

- Pas de sélection partielle (tout ou rien)
- Pas de confirmation par texte à taper (la double confirmation clic suffit)
- Pas de backup automatique avant suppression
- Tables `batches`, `extraction_logs`, `template_quality_stats` ne sont PAS vidées (l'endpoint existant ne les touche pas)
