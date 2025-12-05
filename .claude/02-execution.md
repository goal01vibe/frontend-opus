# Phase 2 : Exécution

## Quand Appliquer
Après la planification, pendant l'implémentation du code.

## Règles OBLIGATOIRES

Chaque règle ci-dessous est NON NÉGOCIABLE. Un code qui ne les respecte pas est INCOMPLET.

---

### 1. LOGGING - Jamais de Code Muet

```python
# ❌ INTERDIT
def process_order(order_id):
    order = db.get(order_id)
    return process(order)

# ✅ OBLIGATOIRE
def process_order(order_id: str) -> Order:
    logger.info(f"[ORDER:PROCESS:START] order_id={order_id}")
    try:
        order = db.get(order_id)
        logger.debug(f"[ORDER:FETCHED] order_id={order_id}")
        result = process(order)
        logger.info(f"[ORDER:PROCESS:SUCCESS] order_id={order_id}")
        return result
    except Exception as e:
        logger.error(f"[ORDER:PROCESS:ERROR] order_id={order_id} error={e}", exc_info=True)
        raise
```

**Chaque fonction DOIT avoir :**
- [ ] Log START avec paramètres (sans données sensibles)
- [ ] Log SUCCESS avec résultat/métriques
- [ ] Log ERROR avec contexte + `exc_info=True`
- [ ] Format : `[DOMAIN:ACTION:STATUS] key=value`

**Niveaux de log à utiliser :**

| Niveau | Quand l'utiliser |
|--------|------------------|
| `DEBUG` | Détails techniques (développement uniquement) |
| `INFO` | Actions métier importantes (START/SUCCESS) |
| `WARNING` | Comportement inattendu mais géré |
| `ERROR` | Erreur nécessitant attention |
| `CRITICAL` | Système en danger, intervention urgente |

---

### 2. TYPAGE - Obligatoire Partout

```python
# ❌ INTERDIT
def process(data, options):
    return result

# ✅ OBLIGATOIRE
from typing import Optional, List, Dict

def process(data: ProcessInput, options: Optional[ProcessOptions] = None) -> ProcessResult:
    return result
```

**Règles :**
- [ ] Tous les paramètres typés
- [ ] Type de retour explicite (même `-> None`)
- [ ] `Optional[]` pour les valeurs nullables
- [ ] Collections typées : `List[str]`, `Dict[str, int]`
- [ ] Imports depuis `typing` si nécessaire

---

### 3. VALIDATION - Ne Jamais Faire Confiance aux Entrées

```python
# ❌ INTERDIT
def create_user(data):
    user = User(**data)

# ✅ OBLIGATOIRE
from pydantic import BaseModel, EmailStr, Field

class CreateUserRequest(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=100)
    age: int = Field(ge=0, le=150)

    class Config:
        extra = "forbid"

def create_user(data: dict) -> User:
    validated = CreateUserRequest(**data)
    return User(**validated.model_dump())
```

**Valider à chaque frontière :** API, CLI, fichiers, webhooks, queues.

---

### 4. GESTION D'ERREURS - Exceptions Custom

```python
# ❌ INTERDIT
raise Exception("Error")
except:
    pass

# ✅ OBLIGATOIRE
class OrderNotFoundError(Exception):
    def __init__(self, order_id: str):
        self.order_id = order_id
        super().__init__(f"Order not found: {order_id}")

try:
    process()
except SpecificError as e:
    logger.error(f"[CONTEXT:ERROR] {e}", exc_info=True)
    raise CustomError(context) from e
```

**Règles :**
- [ ] Exceptions custom par domaine métier
- [ ] Toujours inclure le contexte
- [ ] Jamais `except:` nu
- [ ] Jamais `except: pass`
- [ ] Chaîner avec `from e`

---

### 5. SÉCURITÉ - Non Négociable

```python
# ❌ INTERDIT
API_KEY = "sk_live_123"
query = f"SELECT * FROM users WHERE id = {user_id}"
return {"error": str(e), "trace": traceback.format_exc()}

# ✅ OBLIGATOIRE
import os
API_KEY = os.environ["API_KEY"]
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
return {"error": "Internal error", "reference": error_id}
```

**Checklist :**
- [ ] Secrets en variables d'environnement
- [ ] Requêtes DB paramétrées (jamais de concaténation)
- [ ] Mots de passe hashés (bcrypt/argon2)
- [ ] Stack traces jamais exposées au client
- [ ] Inputs sanitizés (XSS, injection)

---

### 6. RÉSILIENCE - Appels Externes

```python
# ❌ FRAGILE
response = requests.get(url)

# ✅ ROBUSTE
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
def call_api(url: str) -> dict:
    logger.debug(f"[API:CALL] url={url}")
    response = requests.get(url, timeout=(3, 10))
    response.raise_for_status()
    logger.debug(f"[API:SUCCESS] url={url} status={response.status_code}")
    return response.json()
```

**Pour TOUT appel externe :**
- [ ] Timeout (connect + read)
- [ ] Retry avec backoff exponentiel
- [ ] Logging avant/après

---

### 7. IDEMPOTENCE - Opérations Critiques

```python
# Pour paiements, webhooks, jobs :
def process_payment(order_id: str, idempotency_key: str) -> PaymentResult:
    existing = db.get_payment(idempotency_key=idempotency_key)
    if existing:
        logger.info(f"[PAYMENT:SKIP] Already processed: {idempotency_key}")
        return existing

    result = gateway.charge(...)
    db.save_payment(idempotency_key=idempotency_key, result=result)
    return result
```

---

### 8. TRANSACTIONS DB

```python
# ❌ DANGEREUX
db.execute("UPDATE accounts SET balance = balance - 100 WHERE id = 1")
# CRASH ICI = incohérence
db.execute("UPDATE accounts SET balance = balance + 100 WHERE id = 2")

# ✅ ATOMIQUE
with db.transaction():
    db.execute("UPDATE accounts SET balance = balance - 100 WHERE id = 1")
    db.execute("UPDATE accounts SET balance = balance + 100 WHERE id = 2")
```

---

### 9. CONFIGURATION

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    api_key: str
    debug: bool = False

    class Config:
        env_file = ".env"
```

**Toujours créer/mettre à jour `.env.example` avec les nouvelles variables**

---

### 10. DOCUMENTATION

```python
def calculate_total(items: list[Item], discount: float = 0) -> Decimal:
    """
    Calcule le total d'une commande.

    Args:
        items: Liste des articles
        discount: Réduction (0-1)

    Returns:
        Total arrondi à 2 décimales

    Raises:
        ValueError: Si discount invalide
    """
```

**Docstring obligatoire pour :**
- [ ] Fonctions publiques
- [ ] Classes
- [ ] Méthodes complexes (> 10 lignes)

---

### 11. COHÉRENCE - Respecter les Patterns Existants

**AVANT d'écrire du nouveau code :**

```
<thinking>
1. Comment les autres fichiers similaires sont structurés ?
2. Quel style de nommage est utilisé ? (snake_case, camelCase)
3. Y a-t-il des utils/helpers existants à réutiliser ?
4. Comment les erreurs sont gérées ailleurs ?
</thinking>
```

**INTERDIT de :**
- Créer un nouveau pattern si un existe déjà
- Utiliser un style différent du reste du codebase
- Dupliquer du code existant (DRY)
- Ignorer les conventions du projet

---

### 12. COMMITS - Au Fur et à Mesure

**NE PAS attendre d'avoir tout fini pour commit.**

| Quand commit | Message type |
|--------------|--------------|
| Après chaque fichier fonctionnel | `feat: add user validation schema` |
| Après correction d'un bug | `fix: handle null order_id` |
| Avant modification risquée | `wip: before refactoring auth` |

**Format :** `type: description courte`

| Type | Usage |
|------|-------|
| `feat:` | Nouvelle fonctionnalité |
| `fix:` | Correction de bug |
| `refactor:` | Restructuration sans changement fonctionnel |
| `docs:` | Documentation |
| `test:` | Ajout/modification de tests |
| `chore:` | Maintenance, dépendances |

---

### 13. RÉGRESSION - Ne Rien Casser

**Après chaque modification significative :**
- [ ] Le code existant compile toujours
- [ ] Les imports ne sont pas cassés
- [ ] Les tests existants passent encore
- [ ] L'API reste rétro-compatible (si applicable)

**Si un changement casse quelque chose → le corriger IMMÉDIATEMENT avant de continuer**

---

### 14. FRONTEND - Visualisation avec Playwright

**Pour le développement frontend UNIQUEMENT :**

Playwright peut être utilisé pour **voir** ce qu'on code, PAS pour tester (ça c'est Phase 3).

#### Commandes autorisées en Phase 2 :

| Action | Outil | Usage |
|--------|-------|-------|
| Voir la page | `browser_navigate` | Aller sur `localhost:5173/ma-page` |
| Capture écran | `browser_take_screenshot` | Voir le rendu actuel |
| Inspecter structure | `browser_snapshot` | Arbre d'accessibilité (boutons, inputs...) |
| Voir erreurs console | `browser_console_messages` | Détecter erreurs JS/React |

#### Workflow typique :

```
1. Coder le composant
2. browser_navigate → localhost:5173/page-concernee
3. browser_take_screenshot → voir le rendu
4. Si problème visuel → corriger et recommencer
5. browser_console_messages → vérifier pas d'erreurs
```

#### ⚠️ INTERDIT en Phase 2 :
- Tests automatisés (click, fill, assertions)
- Interactions complexes
- Validation de comportements

**Ces actions sont réservées à la Phase 3 (Validation)**

---

## Checklist par Fonction

Avant de passer à la Phase 3, vérifier pour CHAQUE fonction :

| Aspect | Vérifié |
|--------|---------|
| Types (params + retour) | ☐ |
| Logs (START/SUCCESS/ERROR) | ☐ |
| Validation des entrées | ☐ |
| Exceptions custom | ☐ |
| Pas de secrets en dur | ☐ |
| Requêtes DB paramétrées | ☐ |
| Timeouts sur appels externes | ☐ |
| Docstring | ☐ |
| Cohérent avec le codebase | ☐ |

---

## Output

Une fois le code implémenté et les checks passés, passer AUTOMATIQUEMENT à la Phase 3 (Validation).
