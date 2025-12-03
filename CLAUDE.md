# Instructions Claude Code - Frontend Opus

## Fichiers de planification

### Plan futur Frontend + API
**Fichier:** `PLAN_FUTURE_FRONT_API.md`

Contient les plans pour :
1. **BDPM** - Intégration base médicaments (taux remboursement)
2. **API intelligente** - Endpoint unique avec filtres/tri/group dynamiques
3. **Migration AG Grid** - Remplacer TanStack Table pour 100k+ lignes
4. **IA SQL** - Text-to-SQL pour requêtes naturelles

Pour reprendre, dis :
- "implémente BDPM"
- "implémente API intelligente"
- "migre vers AG Grid"
- "implémente IA SQL"

---

## Stack technique

- **Framework:** React + TypeScript + Vite
- **Tables:** TanStack Table v8 (migration AG Grid prévue)
- **State:** Zustand
- **Fetching:** TanStack Query v5
- **UI:** TailwindCSS + Shadcn/ui
- **PDF Viewer:** react-pdf

## API Backend

- **URL:** `http://localhost:8000` (pdf-extractor Docker)
- **Base de données:** PostgreSQL

## Commandes

```bash
npm run dev    # Démarrer en dev (port 5173)
npm run build  # Build production
```
