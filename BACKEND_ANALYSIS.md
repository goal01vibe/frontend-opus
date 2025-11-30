# Analyse Backend pdf-extractor - État Actuel

> **Date**: 2025-11-30 (mis à jour)
> **Objectif**: Identifier ce qui existe vs ce qui manque pour le module d'extraction v2

---

## 1. CE QUI EXISTE DÉJÀ

### 1.1 Redis Staging Service (`app/services/redis_staging.py`)

**Status**: COMPLET - Prêt à l'emploi

```python
class RedisStagingService:
    store_partial_extraction()      # Stocke extraction partielle (TTL 24h)
    get_partial_extraction()        # Récupère par batch_id/file_id
    get_batch_partials()            # Toutes les partielles d'un batch
    delete_partial_extraction()     # Supprime après validation
    get_all_pending_partials()      # Liste toutes les partielles
    get_staging_stats()             # Statistiques globales
    health_check()                  # Vérification Redis
```

**Types d'issues supportés**:
- `NO_TEMPLATE` - Aucun template détecté
- `PARTIAL_TEMPLATE` - Template partiel
- `LOW_CONFIDENCE` - Confiance trop basse
- `VALIDATION_ERROR` - Erreur de validation

**Manque**: Endpoints REST pour exposer ce service

---

### 1.2 Admin Router (`app/routers/admin_router.py`)

**Status**: COMPLET - Endpoints opérationnels

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/admin/logs/level` | GET | Niveau de log actuel |
| `/admin/logs/level` | POST | Changer le niveau (DEBUG/INFO/WARNING/ERROR) |
| `/admin/logs/recent` | GET | Logs récents par type (app, debug, performance, audit) |
| `/admin/logs/dashboard` | GET | Dashboard complet (fichiers + métriques) |
| `/admin/logs/search` | GET | Recherche dans les logs |
| `/admin/performance/metrics` | GET | Métriques de performance détaillées |
| `/admin/performance/current` | GET | Traitements en cours |
| `/admin/performance/failures` | GET | Échecs récents avec détails |
| `/admin/stats` | GET | Statistiques base de données |
| `/admin/templates/quality-report` | GET | Rapport qualité templates |
| `/admin/clear-database` | DELETE | Vider la base (dangereux) |

**Exemple d'utilisation**:
```bash
# Passer en mode DEBUG
curl -X POST "http://localhost:8000/admin/logs/level?level=DEBUG"

# Voir les logs récents
curl "http://localhost:8000/admin/logs/recent?log_type=app&lines=100&level=ERROR"

# Dashboard complet
curl "http://localhost:8000/admin/logs/dashboard"
```

---

### 1.3 Détection PDF Scanné (`app/pdf_extractor.py`)

**Status**: COMPLET - Intégré dans l'extraction

```python
def _detect_scanned_pdf(self, pdf_path: str) -> Tuple[bool, Dict]:
    """
    Détecte si un PDF est scanné (image sans texte).

    Critères:
    1. Ratio images/pages élevé
    2. Couverture image > 80% de la page
    3. Texte extractible minimal

    Returns:
        (is_scanned: bool, info: Dict avec détails)
    """
```

**Déjà géré**: Si PDF scanné détecté → erreur avec message "OCR non supporté"

---

### 1.4 Catégorisation des Erreurs (`app/routers/extraction_router.py`)

**Status**: COMPLET

| Code | Type | Message utilisateur |
|------|------|---------------------|
| `CORRUPTED_PDF` | PDF corrompu | "Fichier PDF corrompu ou invalide" |
| `TRUNCATED_PDF` | PDF tronqué | "PDF incomplet ou tronqué" |
| `NO_TEMPLATE_DETECTED` | Pas de template | "Template non compatible" |
| `NO_TABLE_DATA` | Pas de tableau | "Aucun tableau détecté" |
| `PASSWORD_PROTECTED` | Protégé | "PDF protégé par mot de passe" |
| `ACCESS_DENIED` | Accès refusé | "Accès au fichier refusé" |
| `SCANNED_PDF` | PDF scanné | "OCR non supporté" |

---

### 1.5 Système de Validation et Review Reasons (✅ NOUVEAU 2025-11-30)

**Status**: COMPLET - Implémenté

**Fichiers**:
- `app/models.py` - Colonne `review_reasons` (TEXT, JSON array)
- `app/services/extraction_validator.py` - Génération des raisons
- `app/routers/data_router.py` - Endpoints validation/rejet
- `app/routers/extraction_router.py` - Sauvegarde review_reasons

**Endpoints**:

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/documents` | GET | Liste documents avec `review_reasons` et `confidence_score` |
| `/documents/{id}/validate` | PATCH | Valide manuellement (efface `review_reasons`) |
| `/documents/{id}/reject?reason=X` | PATCH | Rejette (ajoute raison dans `review_reasons`) |

**Review Reasons générées automatiquement**:

| Icône | Message | Déclencheur |
|-------|---------|-------------|
| ❓ | "Aucun template compatible détecté pour ce document" | `template_used` est null |
| ❌ | "X ligne(s) avec écart Qté × Prix ≠ Montant" | Lignes avec calcul incorrect |
| ❌ | "Somme lignes HT (X€) ≠ Somme bases TVA" | Validation HT échouée |
| ❌ | "Total HT + TVA ≠ Net à payer (X€)" | Validation TTC échouée |
| ❌ | "Écart TTC important: X€ (Y%)" | Écart > seuil |
| ⚠️ | "Score de confiance faible: X/100" | Score < 70 |

**Exemple d'utilisation**:
```bash
# Liste documents avec review_reasons
curl "http://localhost:8000/documents?limit=10"

# Valider un document (efface review_reasons)
curl -X PATCH "http://localhost:8000/documents/24/validate"

# Rejeter un document
curl -X PATCH "http://localhost:8000/documents/24/reject?reason=Montants%20incohérents"
```

---

### 1.6 Validation Fichiers (`app/services/file_validator.py`)

**Status**: BASIQUE - À compléter

```python
class FileValidator:
    MAX_FILE_SIZE_MB = 50           # ✅ Limite taille
    ALLOWED_EXTENSIONS = ['.pdf']   # ✅ Extension

    validate_pdf_files()            # ✅ Validation liste
    validate_single_pdf_file()      # ✅ Validation unitaire
```

**Manque**:
- Limite nombre de pages
- Détection corruption avant traitement
- Détection mot de passe avant traitement

---

### 1.6 Tasks Celery (`app/tasks.py`)

**Status**: BASIQUE - À améliorer

```python
@celery_app.task(bind=True)
def process_single_pdf_task(self, file_content, filename, template):
    # ✅ Traite un PDF
    # ❌ Ne publie PAS la progression sur Redis

@celery_app.task(bind=True)
def process_batch_pdfs_task(self, files_data, template):
    # ✅ Traite un batch
    # ❌ Ne publie PAS la progression sur Redis
```

---

## 2. CE QUI MANQUE

### 2.1 SSE Streaming (CRITIQUE)

**Fichier**: À créer dans `app/routers/extraction_router.py`

```python
# MANQUANT - À implémenter
@router.get("/extract-batch-worker/{batch_id}/stream")
async def stream_extraction_progress(batch_id: str, request: Request):
    """
    SSE endpoint pour progression en temps réel.
    Utilise Redis pub/sub pour recevoir les updates des workers.
    """
    pass
```

**Dépendance à installer**: `sse-starlette`

---

### 2.2 Endpoints Staging REST (IMPORTANT)

**Fichier**: À créer `app/routers/staging_router.py`

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/staging` | GET | Liste toutes les extractions en staging |
| `/staging/{batch_id}/{file_id}` | GET | Détail d'une extraction |
| `/staging/{batch_id}/{file_id}` | PUT | Modifier données avant validation |
| `/staging/{batch_id}/{file_id}/validate` | POST | Valider → insérer en DB |
| `/staging/{batch_id}/{file_id}/retry` | POST | Réessayer l'extraction |
| `/staging/{batch_id}/{file_id}` | DELETE | Supprimer |
| `/staging/stats` | GET | Statistiques staging |

**Note**: Le service `RedisStagingService` existe déjà, il suffit de créer les endpoints REST

---

### 2.3 Queue Management (IMPORTANT)

**Fichier**: À créer dans `app/routers/extraction_router.py`

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/extraction-queue` | GET | État de la queue (batchs en attente) |
| `/extraction-queue/{batch_id}` | DELETE | Annuler un batch en queue |
| `/extraction-queue/position/{batch_id}` | GET | Position d'un batch |

---

### 2.4 Workers Status (UTILE)

**Fichier**: À créer `app/routers/workers_router.py`

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/workers/status` | GET | État des workers Celery |
| `/workers/stats` | GET | Statistiques workers |

**Implémentation**: Utiliser `celery.app.control.inspect()`

---

### 2.5 PDFs Protégés (OPTIONNEL)

**Fichier**: À créer `app/routers/protected_router.py`

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/protected-pdfs` | GET | Liste PDFs protégés |
| `/protected-pdfs/{id}/unlock` | POST | Déverrouiller + extraire |
| `/protected-pdfs/{id}` | DELETE | Supprimer |

**Dépendance à installer**: `pikepdf`

---

### 2.6 Publication Progress Redis (CRITIQUE)

**Fichier**: Modifier `app/tasks.py`

```python
# À AJOUTER dans process_single_pdf_task
import redis
redis_client = redis.from_url(REDIS_URL)

@celery_app.task(bind=True)
def process_single_pdf_task(self, file_content, filename, template, batch_id):
    # Publier début
    redis_client.publish(f"batch:{batch_id}", json.dumps({
        "type": "file_start",
        "filename": filename
    }))

    try:
        # ... traitement ...

        # Publier succès
        redis_client.publish(f"batch:{batch_id}", json.dumps({
            "type": "file_complete",
            "filename": filename,
            "status": "success"
        }))
    except Exception as e:
        # Publier erreur
        redis_client.publish(f"batch:{batch_id}", json.dumps({
            "type": "file_error",
            "filename": filename,
            "error": str(e)
        }))
```

---

## 3. RÉCAPITULATIF

### Existant vs Manquant

| Fonctionnalité | Status | Effort |
|----------------|--------|--------|
| Redis Staging Service | ✅ Existe | - |
| Admin Logs/Level | ✅ Existe | - |
| Admin Performance | ✅ Existe | - |
| Admin Stats | ✅ Existe | - |
| Détection PDF scanné | ✅ Existe | - |
| Catégorisation erreurs | ✅ Existe | - |
| File Validator basique | ✅ Existe | - |
| Celery Tasks | ✅ Existe (basique) | - |
| **Review Reasons + Validation** | ✅ **NOUVEAU** (2025-11-30) | - |
| **Endpoints Validate/Reject** | ✅ **NOUVEAU** | - |
| **SSE Streaming** | ❌ Manque | **2-3h** |
| **Endpoints Staging** | ❌ Manque | **1-2h** |
| **Queue Management** | ❌ Manque | **1-2h** |
| **Redis pub/sub Tasks** | ❌ Manque | **1-2h** |
| Workers Status | ❌ Manque | 1h |
| Protected PDFs | ❌ Manque | 2h |
| File Validator avancé | ⚠️ Partiel | 1h |

### Dépendances à installer

```bash
pip install sse-starlette pikepdf
```

---

## 4. PLAN D'ACTION RECOMMANDÉ

### Phase 1: Backend Core (4-6h)

1. **Installer dépendances**
   ```bash
   pip install sse-starlette pikepdf
   ```

2. **Modifier `tasks.py`** - Ajouter publication Redis pub/sub

3. **Créer endpoint SSE** dans `extraction_router.py`

4. **Créer `staging_router.py`** - Exposer RedisStagingService via REST

### Phase 2: Backend Complémentaire (2-3h)

5. **Créer endpoints queue** dans `extraction_router.py`

6. **Améliorer `file_validator.py`** - Détection corruption/password

### Phase 3: Frontend (après backend)

7. Refonte modal extraction
8. Barre progression header
9. Page dédiée /extractions/live

---

## 5. ENDPOINTS EXISTANTS À RÉUTILISER

### Pour le frontend

```javascript
// Logs et Debug
GET /admin/logs/level              // Niveau actuel
POST /admin/logs/level?level=DEBUG // Changer niveau
GET /admin/logs/dashboard          // Dashboard complet
GET /admin/logs/recent?log_type=app&lines=50

// Performance
GET /admin/performance/metrics     // Métriques détaillées
GET /admin/performance/current     // En cours
GET /admin/performance/failures    // Échecs récents

// Stats
GET /admin/stats                   // Stats DB

// Templates
GET /admin/templates/quality-report

// Documents et Validation (✅ NOUVEAU 2025-11-30)
GET /documents                          // Liste avec review_reasons & confidence_score
GET /documents?search=XXX               // Recherche full-text
GET /documents?template=OCP_v1          // Filtre par template
GET /documents/{id}/pdf                 // Télécharger PDF original
PATCH /documents/{id}/validate          // Valider (efface review_reasons)
PATCH /documents/{id}/reject?reason=X   // Rejeter (ajoute review_reasons)
```

### Ces endpoints sont déjà utilisables dans la page Admin !

---

*Document généré le 2025-11-29, mis à jour le 2025-11-30*
