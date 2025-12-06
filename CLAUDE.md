# Instructions Claude Code - Frontend Opus

## 🔗 **PROJETS LIÉS - 3 REPOS GIT SÉPARÉS**

| Projet | Chemin | Description | Port |
|--------|--------|-------------|------|
| **pdf-extractor** | `C:\pdf-extractor\` | API extraction PDF | 8000 |
| **template-lab** | `C:\template-lab\` | Génération templates IA | 8002 |
| **frontend_opus** | `C:\frontend_opus\` | Frontend React extraction (CE PROJET) | 5174 |

**⚠️ 3 PROJETS DISTINCTS** = 3 repos Git = commits/push séparés.
**💡 Toujours préciser le projet concerné dans les demandes.**

---

## 🗂️ **STRUCTURE DE CE PROJET**

```
C:\frontend_opus\         # FRONTEND EXTRACTION (CE PROJET)
├── src/                  # Code source React
├── package.json          # Dépendances npm
└── .git/                 # github.com/goal01vibe/frontend-opus
```

---

## Permissions Agents - Mode Autonome Total

**Les agents ont l'autorisation TOTALE d'exécuter sans demander confirmation :**

| Catégorie | Permissions | Exemples |
|-----------|-------------|----------|
| **Fichiers** | Read, Write, Edit, Glob, Grep | Créer, modifier, supprimer tous fichiers |
| **Bash** | `Bash(*)` | npm, git, mkdir, rm, etc. |
| **Playwright** | `mcp__playwright__*` | Tests E2E, screenshots, navigation |
| **GitHub** | `mcp__github__*` | Issues, PRs, commits, branches |
| **Context7** | `mcp__context7__*` | Documentation bibliothèques |
| **Web** | WebFetch, WebSearch | Recherche documentation |
| **Agents** | `Task(*)` | Lancer sous-agents |

---

## Orchestration Multi-Agents

Pour CHAQUE tâche de développement, suivre ces 3 phases en **BOUCLE** :

```
Phase 1: PLAN   → Lire .claude/01-planification.md
Phase 2: EXEC   → Lire .claude/02-execution.md
Phase 3: VALID  → Lire .claude/03-validation.md
      ↓
Si erreurs → Retour Phase 1 (max 3 itérations)
Si succès  → Proposer commit
```

---

## Règle Commit/Push

Après chaque tâche terminée, proposer : "Tu veux que je commit et push ?"

---

## Règle ISSUES_AND_FIXES.md

**Avant chaque commit**, mettre à jour `ISSUES_AND_FIXES.md` :

```
### [SECTION-XXX] Titre court
- **Date** : YYYY-MM-DD
- **Symptôme** : Ce qui se passe
- **Cause** : Pourquoi
- **Fichier** : chemin/fichier.tsx:ligne
- **Fix** : Ce qui a été fait
- **Statut** : Résolu | En cours
```

Sections : `UI-XXX`, `API-XXX`, `PERF-XXX`

---

## Fichiers de planification

**Fichier:** `PLAN_FUTURE_FRONT_API.md`

Plans pour :
1. **BDPM** - Intégration base médicaments
2. **API intelligente** - Endpoint unique avec filtres dynamiques
3. **Migration AG Grid** - Remplacer TanStack Table pour 100k+ lignes
4. **IA SQL** - Text-to-SQL pour requêtes naturelles

---

## Stack technique

- **Framework:** React 18 + TypeScript + Vite
- **Tables:** TanStack Table v8
- **State:** Zustand (persistence localStorage)
- **Fetching:** TanStack Query v5 + Axios
- **UI:** TailwindCSS + Shadcn/ui + Radix
- **PDF Viewer:** react-pdf v9
- **Icons:** lucide-react

---

## Composants clés

| Composant | Fichier | Description |
|-----------|---------|-------------|
| ExtractionDrawer | `src/components/extractions/ExtractionDrawer.tsx` | Panneau latéral facture (PDF + infos + TVA) |
| ExtractionsTable | `src/components/extractions/ExtractionsTable.tsx` | Tableau documents |
| TVARecapTable | `src/components/common/TVARecapTable.tsx` | Ventilation TVA |
| StatusBadge | `src/components/common/StatusBadge.tsx` | Badge statut |

---

## API Backend

- **URL:** `http://localhost:8000` (pdf-extractor Docker)
- **Base de données:** PostgreSQL (via Docker)

---

## Commandes

```bash
npm run dev    # Démarrer en dev (port 5173)
npm run build  # Build production
```

---

**Dernière mise à jour** : 2025-12-06
