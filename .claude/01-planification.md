# Phase 1 : Planification

## Quand Appliquer
AVANT de coder quoi que ce soit. Aucune exception.

---

## Processus Obligatoire

### 1. Réflexion Structurée

```
<thinking>
1. QUOI : Qu'est-ce qui est demandé exactement ?
2. POURQUOI : Quel problème résout-on ? Quel est l'objectif final ?
3. CONTEXTE : Code existant ? Patterns déjà en place ? Contraintes techniques ?
4. DÉCOMPOSITION : Quelles étapes ? Dans quel ordre logique ?
5. DÉPENDANCES : Qu'est-ce qui dépend de quoi ? Ordre d'exécution ?
6. RISQUES : Points de blocage potentiels ? Edge cases ?
7. IMPACT : Quels autres fichiers/fonctions pourraient être affectés ?
</thinking>
```

---

### 2. Évaluation de Complexité

| Niveau | Critères | Action Requise |
|--------|----------|----------------|
| 🟢 **Simple** | 1-2 fichiers, logique claire, pas de nouveau pattern | Exécuter directement |
| 🟡 **Moyen** | 3-5 fichiers, nouveau pattern à suivre | Annoncer le plan, puis exécuter |
| 🔴 **Complexe** | >5 fichiers, refactoring, modif DB/API | **DEMANDER VALIDATION USER** avant d'exécuter |

**Indicateurs de complexité élevée :**
- Modification de schéma de base de données
- Changement d'architecture ou de patterns existants
- Impact sur plusieurs modules/composants
- Intégration avec services externes

---

### 3. Recherche Documentaire

#### Ordre de Priorité (RESPECTER CET ORDRE)

| Étape | Source | Objectif | Exemple |
|-------|--------|----------|---------|
| 🥇 **1. Web Search** | Sites fiables (docs officielles, GitHub, Stack Overflow) | **Évaluer les options** : quel framework/lib choisir ? | "best Python PDF table extraction 2025" |
| 🥈 **2. Vérifier l'existant** | npm, pip, GitHub, built-in features | **Ne pas réinventer la roue** : existe-t-il une lib qui fait déjà ça ? | Fuzzy search → `rapidfuzz`, `pg_trgm`, FTS5 |
| 🥉 **3. Context7 MCP** | Documentation officielle | **Apprendre à utiliser** la solution choisie | Docs React, FastAPI, Pydantic... |
| 4. **Codebase existant** | Fichiers du projet | **Respecter les patterns** déjà en place | Comment les autres endpoints sont structurés ? |

---

#### RÈGLE ANTI-RÉINVENTION

**AVANT de coder une fonctionnalité, TOUJOURS vérifier :**

```
<thinking>
1. Cette fonctionnalité existe-t-elle déjà dans le projet ?
2. Existe-t-il une librairie/package qui fait ça ?
   → pip search, npm search, GitHub "awesome-X" lists
3. Le framework/DB utilisé a-t-il cette feature en built-in ?
   → PostgreSQL: pg_trgm, FTS | SQLite: FTS5 | React: hooks natifs
4. Peut-on adapter une solution existante plutôt que coder from scratch ?
</thinking>
```

**Exemples concrets :**

| Besoin | ❌ Mauvais réflexe | ✅ Bon réflexe |
|--------|-------------------|----------------|
| Recherche floue en DB | Coder un algorithme Levenshtein | `rapidfuzz` + `pg_trgm` ou SQLite FTS5 |
| Validation de données | If/else manuels partout | Pydantic, Zod, Joi |
| Extraction PDF | Parser le texte à la main | pdfplumber, camelot, tabula |
| État global React | Props drilling sur 10 niveaux | Zustand, Redux, Context API |
| Authentification | Coder JWT from scratch | `python-jose`, `authlib`, ou service externe |

---

#### Sources Web Fiables à Privilégier

| Domaine | Sources fiables |
|---------|-----------------|
| **Général** | Documentation officielle, GitHub repos avec >1k stars |
| **Python** | PyPI, Real Python, Python docs |
| **JavaScript** | MDN, npm (packages populaires), React/Vue/Next docs |
| **DevOps** | Docker docs, DigitalOcean tutorials |
| **Base de données** | PostgreSQL/SQLite docs officielles |

**⚠️ ÉVITER :** Medium (qualité variable), tutoriels datés (>2 ans), sites avec trop de pubs

---

### 4. Vérification Historique

**AVANT de modifier un fichier, consulter `ISSUES_AND_FIXES.md` :**

```
Section pertinente à lire selon le domaine :
- API-XXX : Endpoints FastAPI backend
- AGENT-XXX : Agents IA Senior/Junior
- DB-XXX : SQLite, modèles de données
- UI-XXX : React, composants frontend
- TPL-XXX : Génération templates JSON
```

**Objectif :** Éviter de réintroduire des bugs déjà corrigés.

---

### 5. Plan d'Exécution

**Si la tâche a > 3 étapes → Utiliser TodoWrite pour tracker la progression**

Checklist obligatoire avant de coder :

| Élément | Question à se poser |
|---------|---------------------|
| **Fichiers** | Lesquels créer/modifier ? Dans quel ordre ? |
| **Types/Validation** | Schémas Pydantic nécessaires ? Validation des inputs ? |
| **Gestion d'erreurs** | Exceptions custom à créer ? Try/catch nécessaires ? |
| **Logs** | Quels points critiques logger ? Quel niveau (info/warning/error) ? |
| **Tests** | Quels tests unitaires/intégration écrire ? |
| **Sécurité** | Inputs sanitizés ? Injections possibles ? |

---

### 6. Stratégie de Rollback

Pour toute modification non-triviale :

| Étape | Action |
|-------|--------|
| **Avant** | Noter l'état actuel (`git status`, `git log -1`) |
| **Pendant** | Commits atomiques (1 commit = 1 changement logique) |
| **Si échec** | Savoir comment revenir en arrière (`git checkout`, `git revert`) |

**Fichiers critiques à ne JAMAIS modifier sans backup mental :**
- Configuration DB (`models.py`, `engine.py`)
- Points d'entrée API (`main.py`, `routes/`)
- Configuration Docker (`docker-compose.yml`, `Dockerfile`)

---

## Output Attendu

Annoncer le plan de façon structurée :

```
🎯 Objectif : [description en 1 ligne]

📊 Complexité : [🟢 Simple | 🟡 Moyen | 🔴 Complexe]

📋 Plan :
1. [Étape 1] → fichier(s) concerné(s)
2. [Étape 2] → fichier(s) concerné(s)
3. [Étape 3] → fichier(s) concerné(s)

📚 Recherche effectuée :
- Web : [frameworks/libs évalués]
- Libs existantes : [solutions trouvées ou "aucune adaptée"]
- Context7 : [documentation consultée]

⚠️ Points d'attention : [risques identifiés, si applicable]
```

**Si complexité 🔴 → STOP et demander validation utilisateur**

**Sinon → Passer AUTOMATIQUEMENT à la Phase 2 (Exécution)**
