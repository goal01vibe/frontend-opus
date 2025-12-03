# Plan Global - PDF Extractor & Frontend

## Date: 01/12/2025

---

# PARTIE 1 : BDPM - Base de Données Publique des Médicaments

## Objectif
Enrichir les extractions de factures PDF avec le **taux de remboursement** des médicaments.

## Ce qui a été fait
1. ✅ Téléchargé les fichiers BDPM depuis le site officiel
2. ✅ Analysé la structure des 2 fichiers
3. ✅ Identifié les colonnes utiles

## Fichiers téléchargés
Dossier: `C:\template-lab\C:template-labbdpm_analysis\`
- `CIS_bdpm_new.txt` - 15,823 spécialités (noms médicaments)
- `CIS_CIP_bdpm_new.txt` - 20,933 présentations (CIP, prix, remboursement)

## Structure des fichiers BDPM

### CIS_bdpm.txt (12 colonnes, TAB-separated)
| Col | Nom | Utile |
|-----|-----|-------|
| 1 | code_cis | ✅ FK |
| 2 | denomination | ✅ Nom médicament |
| 3-12 | autres infos | Non |

### CIS_CIP_bdpm.txt (13 colonnes, TAB-separated)
| Col | Nom | Utile |
|-----|-----|-------|
| 1 | code_cis | FK |
| 2 | code_cip7 | CIP 7 chiffres |
| 7 | code_cip13 | ✅ Code-barres |
| 9 | taux_remboursement | ✅ 100%, 65%, 30%, 15%, vide |
| 10 | prix_ht | ✅ Prix HT |
| 11 | prix_ttc | ✅ Prix TTC |

## Intégration avec pdf-extractor

### Table PostgreSQL `Extraction` (existante)
```python
code_article = Column(String)  # ← C'est le CODE CIP !
taux_tva = Column(Numeric)     # Déjà présent
```

### Colonnes à ajouter
```python
taux_remboursement = Column(String, nullable=True)  # "100%", "65%", "30%", "15%", NULL (taux à la date de la facture)
type_produit = Column(String, nullable=True)        # "medicament" si trouvé dans BDPM, NULL sinon
```

### Distinction médicament vs autres produits

| Dans BDPM ? | taux_remboursement | type_produit | Signification |
|-------------|-------------------|--------------|---------------|
| ✅ Oui | "65%", "30%", etc. | "medicament" | Médicament remboursé |
| ✅ Oui | NULL | "medicament" | Médicament NON remboursé |
| ❌ Non | NULL | NULL | Autre (parapharmacie, complément...) |

### Filtres SQL utiles
```sql
-- Médicaments non remboursés uniquement
WHERE type_produit = 'medicament' AND taux_remboursement IS NULL

-- Non-médicaments (parapharmacie, compléments...)
WHERE type_produit IS NULL

-- Tous les médicaments (remboursés ou non)
WHERE type_produit = 'medicament'

-- Médicaments remboursés
WHERE type_produit = 'medicament' AND taux_remboursement IS NOT NULL
```

## Gestion des changements de taux de remboursement

### Problème
Un médicament peut changer de taux de remboursement dans le temps :
```
Doliprane 1000mg :
- Avant 01/06/2024 : remboursé 65%
- Après 01/06/2024 : remboursé 30%

Facture du 15/05/2024 → doit afficher 65% (taux à l'époque)
Facture du 15/07/2024 → doit afficher 30% (taux actuel)
```

### Solution : Table historique (SQLite local)

```sql
CREATE TABLE bdpm_remboursement_history (
    id INTEGER PRIMARY KEY,
    code_cip13 TEXT NOT NULL,
    taux_remboursement TEXT,        -- "65%", "30%", "15%", "100%", NULL
    date_debut DATE NOT NULL,       -- Début de validité
    date_fin DATE,                  -- NULL = toujours valide (taux actuel)
    UNIQUE(code_cip13, date_debut)
);

CREATE INDEX idx_cip_dates ON bdpm_remboursement_history(code_cip13, date_debut, date_fin);
```

### Logique de sync quotidienne

```python
def sync_bdpm():
    # 1. Télécharger fichiers BDPM
    # 2. Pour chaque CIP, comparer taux actuel vs taux en base
    # 3. Si différent :
    #    - Fermer ancien enregistrement (date_fin = hier)
    #    - Créer nouveau (date_debut = aujourd'hui, date_fin = NULL)
```

### Lookup lors extraction PDF

```python
def enrichir_produit(code_cip: str, date_facture: date) -> dict:
    """Retourne type_produit et taux_remboursement"""
    result = db.query("""
        SELECT taux_remboursement FROM bdpm_remboursement_history
        WHERE code_cip13 = :cip
          AND date_debut <= :date_facture
          AND (date_fin IS NULL OR date_fin >= :date_facture)
        LIMIT 1
    """, {"cip": code_cip, "date_facture": date_facture}).first()

    if result is not None:
        # Trouvé dans BDPM = c'est un médicament
        return {
            "type_produit": "medicament",
            "taux_remboursement": result.taux_remboursement  # peut être NULL
        }
    else:
        # Pas dans BDPM = parapharmacie, complément, etc.
        return {
            "type_produit": None,
            "taux_remboursement": None
        }
```

### Endpoint pour vérifier taux actuel

```python
GET /bdpm/{cip}/taux-actuel
→ {"taux": "30%", "depuis": "2024-06-01"}
```

### Alerte frontend (si taux a changé)

```typescript
// Lors de l'affichage d'une ligne
const tauxFacture = ligne.taux_remboursement;  // "65%" (stocké dans PostgreSQL)
const tauxActuel = await fetchTauxActuel(ligne.code_article);  // "30%" (API temps réel)

if (tauxFacture && tauxActuel && tauxFacture !== tauxActuel.taux) {
    // Afficher ⚠️ "Taux modifié : était 65%, maintenant 30% (depuis 01/06/2024)"
}
```

### Résumé stockage

| Donnée | Stockée où | Quand |
|--------|-----------|-------|
| Type produit | PostgreSQL `Extraction.type_produit` | Lors extraction PDF |
| Taux à date facture | PostgreSQL `Extraction.taux_remboursement` | Lors extraction PDF |
| Historique taux | SQLite `bdpm_remboursement_history` | Sync quotidienne BDPM |
| Alerte changement | Frontend (comparaison temps réel) | Affichage tableau |

## Fonctionnalités à implémenter

1. **Base SQLite locale** - 21,000 médicaments (CIP, nom, prix, remboursement, TVA calculée)
2. **Table historique remboursement** - Track les changements de taux dans le temps
3. **Recherche floue frontend** - `/bdpm/search?q=doliprane`
4. **Enrichissement automatique** - Lookup CIP + date facture lors extraction PDF
5. **Sync quotidienne** - Télécharge fichiers BDPM et détecte changements de taux
6. **Alerte frontend** - Affiche ⚠️ si taux actuel différent du taux à date facture

## Calcul TVA
```python
def calculer_taux_tva(prix_ht, prix_ttc):
    taux_legaux = [0, 2.1, 5.5, 10, 20]
    tva_brute = ((prix_ttc - prix_ht) / prix_ht) * 100
    return min(taux_legaux, key=lambda t: abs(t - tva_brute))
```

---

# PARTIE 2 : Migration Table Frontend vers AG Grid

## Problème
- TanStack Table actuel = OK pour < 50k lignes
- Futur = centaines de milliers de lignes
- Besoin : virtualisation, performance, infinite scroll

## Solution recommandée
**AG Grid Community (gratuit)** + API intelligente côté backend

### Pourquoi AG Grid Community suffit
| Feature | Community (gratuit) | Enterprise (payant) |
|---------|---------------------|---------------------|
| Virtualisation DOM | ✅ | ✅ |
| Tri/Filtres | ✅ | ✅ |
| Infinite scroll | ✅ | ✅ |
| Export CSV | ✅ | ✅ |
| Pivoting | ❌ | ✅ |
| Server-side grouping auto | ❌ | ✅ |

### Le backend fait le travail SQL
```python
# Un seul endpoint intelligent
GET /extractions?filter[fournisseur]=OCP&sort=-date&groupBy=fournisseur&page=1&limit=50
```

Le frontend demande, le backend fait le SQL, AG Grid affiche.

---

# PARTIE 3 : Vision Future - IA + SQL Dynamique

## Architecture cible
```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌────────────┐
│   User      │ →   │   IA        │ →   │   Backend    │ →   │ PostgreSQL │
│  "question" │     │ génère SQL  │     │  valide SQL  │     │  exécute   │
└─────────────┘     └─────────────┘     │  + exécute   │     └────────────┘
                                        └──────────────┘
```

## Exemple
```
User: "Montre moi les factures OCP > 1000€ du mois dernier"
     ↓
IA génère: SELECT * FROM documents
           WHERE fournisseur='OCP' AND net_a_payer > 1000
           AND date_document >= '2024-11-01'
           ORDER BY net_a_payer DESC
     ↓
Backend valide + exécute
     ↓
Frontend affiche dans AG Grid
```

## Endpoint générique
```python
@router.post("/query")
def execute_query(sql: str, params: dict = None):
    # Sécurité: uniquement SELECT
    if not sql.strip().upper().startswith("SELECT"):
        raise HTTPException(400, "Only SELECT allowed")

    result = db.execute(text(sql), params)
    return {"data": [dict(row) for row in result]}
```

## Sécurité obligatoire
1. **Whitelist tables/colonnes** - L'IA ne peut requêter que certaines tables
2. **Read-only PostgreSQL user** - User qui ne peut que SELECT
3. **Validation SQL** - Parser avant exécution
4. **Paramètres bindés** - Jamais de valeurs en dur

---

# Ordre de priorité

1. **BDPM** - Enrichir extractions avec taux remboursement
2. **API intelligente** - Endpoint unique avec filtres/tri/group dynamiques
3. **Migration AG Grid** - Remplacer TanStack Table
4. **IA SQL** - Text-to-SQL pour requêtes naturelles

---

# Pour reprendre

Dis simplement :
- "implémente BDPM" → Partie 1
- "implémente API intelligente" → Partie 2
- "migre vers AG Grid" → Partie 3
- "implémente IA SQL" → Partie 4
