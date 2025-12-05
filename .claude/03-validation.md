# Phase 3 : Test & Validation

## Quand Appliquer
Après l'implémentation, pour valider le code produit.

---

## ⛔ RÈGLE ABSOLUE : PAS DE MOCKS

```
┌────────────────────────────────────────────────────────────────┐
│                    ⛔ MOCKS INTERDITS ⛔                        │
│                                                                 │
│   JAMAIS :                                                      │
│   • jest.fn() / jest.mock() / jest.spyOn()                      │
│   • unittest.mock / MagicMock / patch                           │
│   • sinon.stub() / sinon.spy()                                  │
│   • Fake data inventée                                          │
│                                                                 │
│   TOUJOURS :                                                    │
│   • Vraie DB (TestContainers, SQLite test, Docker)              │
│   • Vrais appels API (Stripe sk_test_xxx, sandbox)              │
│   • Vraies données seed                                         │
│   • Vrais workflows end-to-end                                  │
└────────────────────────────────────────────────────────────────┘
```

**Pourquoi ?**
- Les mocks cachent les vrais bugs
- Les mocks donnent une fausse confiance
- Les mocks deviennent obsolètes silencieusement

---

## Processus de Validation

### 1. Audit du Code

Vérifier automatiquement :

```bash
# Exceptions avalées
grep -rn "except:" --include="*.py"
grep -rn "except.*pass" --include="*.py"

# Secrets en dur
grep -rn "api_key\s*=\s*['\"]" --include="*.py"
grep -rn "password\s*=\s*['\"]" --include="*.py"

# SQL injection
grep -rn 'f".*SELECT.*{' --include="*.py"
grep -rn 'f".*INSERT.*{' --include="*.py"

# Mocks à supprimer
grep -rn "mock\|Mock\|MagicMock\|patch" --include="*.py"
grep -rn "jest.fn\|jest.mock" --include="*.ts" --include="*.js"
```

**Checklist Audit :**
- [ ] Chaque fonction a des logs
- [ ] Entrées validées (schémas)
- [ ] Exceptions custom (pas de `Exception` générique)
- [ ] Aucun secret en dur
- [ ] Requêtes DB paramétrées
- [ ] Timeouts sur appels externes
- [ ] AUCUN MOCK

---

### 2. Types de Tests - Quand Utiliser Quoi

| Type | Quand | Exemple |
|------|-------|---------|
| **Unitaire** | Fonction pure, calcul, transformation | `test_calculate_total()` |
| **Intégration** | Interaction DB/API/Services | `test_create_order_in_db()` |
| **E2E** | Workflow utilisateur complet | `test_checkout_flow()` |

**Ratio recommandé :** 70% intégration, 20% E2E, 10% unitaire

**IMPORTANT :** Privilégier les tests d'intégration car ils testent le comportement réel

---

### 3. Création des Tests Backend (Vraies Données)

#### Setup avec vraie infrastructure

```python
# tests/conftest.py
import pytest
from testcontainers.postgres import PostgresContainer

@pytest.fixture(scope="session")
def database():
    """Lance une VRAIE base PostgreSQL"""
    with PostgresContainer("postgres:15") as postgres:
        run_migrations(postgres.get_connection_url())
        seed_test_data(postgres.get_connection_url())
        yield postgres.get_connection_url()

@pytest.fixture
def api_client(database):
    """Client connecté à la vraie DB"""
    app.config["DATABASE_URL"] = database
    return TestClient(app)
```

#### Structure des tests - Happy Path

```python
def test_create_order_success(database, api_client):
    """
    GIVEN un utilisateur et des produits en stock
    WHEN une commande est créée
    THEN la commande est persistée et le stock décrémenté
    """
    # Arrange - VRAIES données en DB
    user = get_test_user(database)
    product = get_test_product(database, stock=10)

    # Act - VRAI appel API
    response = api_client.post("/orders", json={
        "user_id": user.id,
        "items": [{"product_id": product.id, "quantity": 2}]
    })

    # Assert - Vérification en VRAIE DB
    assert response.status_code == 201
    order = get_order_from_db(database, response.json()["id"])
    assert order is not None

    # Vérifier side effects réels
    updated_product = get_product_from_db(database, product.id)
    assert updated_product.stock == 8
```

#### Seed data réaliste

```python
def seed_test_data(database_url: str):
    """Données de test réalistes - PAS de fake"""
    db = connect(database_url)

    users = [
        User(id="user_1", email="alice@test.com", name="Alice"),
        User(id="user_2", email="bob@test.com", name="Bob"),
    ]

    products = [
        Product(id="prod_1", name="Widget A", price=29.99, stock=100),
        Product(id="prod_2", name="Widget B", price=49.99, stock=50),
    ]

    db.bulk_insert(users + products)
    db.commit()
```

---

### 4. Tester les Chemins d'Erreur

**NE PAS tester que le happy path !**

```python
def test_create_order_insufficient_stock(database, api_client):
    """GIVEN un produit avec stock=1, WHEN commande qty=5, THEN erreur 400"""
    product = get_test_product(database, stock=1)

    response = api_client.post("/orders", json={
        "items": [{"product_id": product.id, "quantity": 5}]
    })

    assert response.status_code == 400
    assert "insufficient_stock" in response.json()["error"]

def test_create_order_invalid_product(database, api_client):
    """GIVEN un product_id inexistant, WHEN commande, THEN erreur 404"""
    response = api_client.post("/orders", json={
        "items": [{"product_id": "fake_id", "quantity": 1}]
    })

    assert response.status_code == 404
```

**Cas d'erreur à toujours tester :**
- [ ] Input invalide (validation Pydantic)
- [ ] Ressource non trouvée (404)
- [ ] Permissions insuffisantes (403)
- [ ] Conflit de données (409)
- [ ] Timeout/Service indisponible (503)

---

### 5. Tests Frontend E2E (Playwright)

**Pour TOUT composant frontend modifié :**

```python
# tests/e2e/test_user_flow.py
async def test_login_flow(page):
    """
    GIVEN la page de login
    WHEN l'utilisateur entre ses credentials
    THEN il est redirigé vers le dashboard
    """
    await page.goto("http://localhost:5173/login")

    # Remplir le formulaire
    await page.fill('[data-testid="email"]', "alice@test.com")
    await page.fill('[data-testid="password"]', "testpass123")
    await page.click('[data-testid="submit"]')

    # Vérifier redirection
    await expect(page).to_have_url("/dashboard")
    await expect(page.locator("h1")).to_contain_text("Bienvenue")
```

**Outils Playwright autorisés en Phase 3 :**

| Action | Outil | Usage |
|--------|-------|-------|
| Remplir formulaire | `browser_fill_form` | Tester inputs |
| Cliquer | `browser_click` | Tester boutons/liens |
| Vérifier contenu | `browser_snapshot` | Assertions sur texte/structure |
| Screenshot | `browser_take_screenshot` | Régression visuelle |
| Vérifier erreurs | `browser_console_messages` | Pas d'erreurs JS |
| Attendre élément | `browser_wait_for` | Éléments async |

**Checklist E2E Frontend :**
- [ ] Formulaires fonctionnent (remplir + soumettre)
- [ ] Navigation correcte (liens, redirections)
- [ ] Messages d'erreur affichés
- [ ] Pas d'erreurs dans la console
- [ ] Responsive (si applicable)

---

### 6. Alternatives aux Mocks

| Au lieu de... | Utiliser... |
|---------------|-------------|
| Mock DB | TestContainers / SQLite :memory: / Docker |
| Mock Redis | Redis Docker / TestContainers |
| Mock Stripe | Mode test Stripe (`sk_test_xxx`) |
| Mock S3 | LocalStack / MinIO |
| Mock HTTP | WireMock / Service de staging |
| Fake data | Seed data réaliste |

---

### 7. Couverture - Règles Flexibles

| Situation | Couverture minimum |
|-----------|-------------------|
| Nouveau code critique (paiement, auth) | 90% |
| Nouveau code standard | 80% |
| Modification code existant | Ne pas baisser la couverture |
| Code UI/Frontend | 60% (+ tests E2E) |
| Scripts/Utils one-shot | 50% |

**IMPORTANT :** Une couverture de 100% avec des mauvais tests est INUTILE.
Mieux vaut 70% avec des tests pertinents.

---

### 8. Exécution

```bash
# Backend - Tous les tests avec couverture
pytest tests/ -v --cov=src --cov-report=term-missing

# Backend - Tests spécifiques
pytest tests/test_orders.py -v

# Frontend - Tests E2E
npx playwright test

# Frontend - Tests E2E avec UI
npx playwright test --ui
```

---

### 9. Exécuter TOUS les Tests (Pattern CI/CD)

**NE PAS s'arrêter au premier échec !**

```
┌─────────────────────────────────────────────────────────────┐
│  EXÉCUTER TOUS LES TESTS - COLLECTER TOUTES LES ERREURS    │
│                                                             │
│  ❌ Test 1 : FAIL - division by zero (line 42)              │
│  ❌ Test 2 : FAIL - missing field 'email'                   │
│  ✅ Test 3 : PASS                                           │
│  ❌ Test 4 : FAIL - timeout API call                        │
│  ✅ Test 5 : PASS                                           │
│                                                             │
│  RÉSULTAT : 3/5 passés, 2 échecs                           │
└─────────────────────────────────────────────────────────────┘
```

**Pourquoi tout exécuter ?**
- Une erreur peut en cacher d'autres
- Vue complète = meilleure planification de correction
- C'est ce que font les vrais pipelines CI/CD

---

### 10. Boucle de Correction Automatique

**Si des tests échouent → RETOUR AUTOMATIQUE Phase 1**

```
┌─────────────────────────────────────────────────────────────┐
│              BOUCLE AUTO-CORRECTIVE                         │
│                                                             │
│   Phase 1 ──→ Phase 2 ──→ Phase 3                          │
│      ▲                        │                             │
│      │                        ▼                             │
│      │                  ┌───────────┐                       │
│      │                  │ Erreurs ? │                       │
│      │                  └─────┬─────┘                       │
│      │                        │                             │
│      │              ┌─────────┴─────────┐                   │
│      │              │                   │                   │
│      │             OUI                 NON                  │
│      │              │                   │                   │
│      │              ▼                   ▼                   │
│      │        Itération < 3 ?      ✅ TERMINÉ              │
│      │              │                                       │
│      │        ┌─────┴─────┐                                 │
│      │        │           │                                 │
│      │       OUI         NON                                │
│      │        │           │                                 │
│      └────────┘           ▼                                 │
│                    ⚠️ AIDE HUMAINE                          │
└─────────────────────────────────────────────────────────────┘
```

**Format de retour vers Phase 1 :**

```
🔄 ITÉRATION X/3 - Correction automatique

📋 Erreurs collectées :
┌─────────────────────────────────────────────────────────────┐
│ 1. test_create_order : AssertionError                       │
│    Fichier : tests/test_orders.py:45                        │
│    Message : expected 201, got 400                          │
│                                                             │
│ 2. test_user_validation : ValidationError                   │
│    Fichier : tests/test_users.py:23                         │
│    Message : field 'email' is required                      │
│                                                             │
│ 3. Console Error (Frontend) :                               │
│    TypeError: Cannot read property 'map' of undefined       │
│    Fichier : src/components/OrderList.tsx:15                │
└─────────────────────────────────────────────────────────────┘

🎯 Analyse des causes probables :
- Erreur 1 : Validation manquante dans endpoint
- Erreur 2 : Schéma Pydantic incomplet
- Erreur 3 : État initial null non géré

⚙️ Retour Phase 1 avec ce contexte...
```

**Après 3 échecs consécutifs :**

```
⚠️ INTERVENTION HUMAINE REQUISE

3 tentatives de correction ont échoué.

Historique des erreurs :
┌─────────────────────────────────────────────────────────────┐
│ Itération 1 : ValidationError - champ manquant              │
│ Itération 2 : ValidationError - type incorrect              │
│ Itération 3 : ValidationError - contrainte non respectée    │
└─────────────────────────────────────────────────────────────┘

Analyse : Le problème semble lié au schéma de validation.
Hypothèse : Incompatibilité entre les données existantes et le nouveau schéma.

❓ Besoin de clarification sur : [question spécifique]
```

---

### 11. Si Problème Trouvé → ISSUES_AND_FIXES.md

**Quand un bug est découvert et corrigé, DOCUMENTER dans `ISSUES_AND_FIXES.md` :**

```markdown
### [SECTION-XXX] Titre court du problème
- **Date** : YYYY-MM-DD
- **Symptôme** : Ce qui se passait
- **Cause** : Pourquoi ça arrivait
- **Fichier** : chemin/fichier.py:ligne
- **Fix** : Ce qui a été fait pour corriger
- **Test ajouté** : test_xxx.py::test_nom_du_test
- **Statut** : Résolu
```

**Sections disponibles :**
- `API-XXX` : Endpoints FastAPI backend
- `AGENT-XXX` : Agents IA Senior/Junior
- `DB-XXX` : SQLite, modèles de données
- `UI-XXX` : React, composants frontend
- `TPL-XXX` : Génération templates JSON

**Workflow si problème :**

```
1. ❌ Issue trouvée : [description]
   Fichier : [path:ligne]

2. 🔧 Correction appliquée...

3. 🧪 Test ajouté pour couvrir ce cas

4. 📝 Documenté dans ISSUES_AND_FIXES.md

5. ✅ Re-validation complète
```

---

## Output Final

```
🧪 Validation terminée

Audit :
✅ Logging : OK (X logs trouvés)
✅ Sécurité : OK (aucun secret, requêtes paramétrées)
✅ Erreurs : OK (X exceptions custom)
✅ Mocks : OK (aucun mock trouvé)

Tests Backend :
✅ Happy path : X/X passés
✅ Cas d'erreur : X/X passés
✅ Couverture : XX%

Tests Frontend : (si applicable)
✅ E2E Playwright : X/X passés
✅ Console : Aucune erreur

Issues : (si applicable)
📝 X issue(s) trouvée(s) et documentée(s) dans ISSUES_AND_FIXES.md

📦 Implémentation terminée et validée.
```

---

## Checklist Finale

| Aspect | Vérifié |
|--------|---------|
| **Audit** | |
| ☐ Logs présents (START/SUCCESS/ERROR) | |
| ☐ Aucun secret en dur | |
| ☐ Requêtes DB paramétrées | |
| ☐ Aucun mock dans les tests | |
| **Tests Backend** | |
| ☐ Happy path testé | |
| ☐ Cas d'erreur testés | |
| ☐ Vraie DB utilisée | |
| ☐ Couverture respectée | |
| **Tests Frontend** (si applicable) | |
| ☐ E2E Playwright créés | |
| ☐ Formulaires testés | |
| ☐ Pas d'erreurs console | |
| **Documentation** | |
| ☐ Issues trouvées → ISSUES_AND_FIXES.md | |
| ☐ Tous les tests passent | |
