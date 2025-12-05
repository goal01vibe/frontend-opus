# Issues et Corrections - Frontend Opus

> **Ce fichier documente les problèmes rencontrés et leurs corrections.**
> **À mettre à jour après chaque bug trouvé/corrigé.**

---

## UI - Interface Utilisateur

### [UI-001] Ajout mode Split View dans ExtractionDrawer
- **Date** : 2025-12-06
- **Symptôme** : Utilisateur doit basculer entre onglets pour voir PDF et infos TVA
- **Cause** : Design initial avec onglets séparés
- **Fichier** : src/components/extractions/ExtractionDrawer.tsx
- **Fix** : Ajout switch pour afficher PDF + Infos côte à côte
  - State `splitView` pour gérer le mode
  - Largeur drawer dynamique (420px → 900px)
  - Layout flex avec PDF gauche (50%) + Infos droite (50%)
  - Transition fluide 300ms
  - Onglets masqués en mode split
- **Statut** : Résolu

---

## API - Endpoints Backend

### [API-001] Extractions factures incorrectes - Toutes les factures
- **Date** : 2025-12-06
- **Symptôme** : Les valeurs extraites des factures semblent incorrectes (ex: facture 5405115051 affiche 295,89€)
- **Cause** : À investiguer - problème potentiel dans le backend pdf-extractor
- **Fichier** : Backend pdf-extractor (C:\pdf-extractor\app\)
- **Données observées** :
  - Document ID 1: 5405115051 → net_a_payer: 295.89€, 14 lignes extraites
  - Confidence score: 100% mais valeurs potentiellement erronées
  - Template utilisé: OCP_v1
- **Investigation requise** :
  - Comparer les valeurs extraites avec les PDFs originaux
  - Vérifier le template OCP_v1 et ses règles d'extraction
  - Tester l'endpoint `/documents/{id}/lignes` (retourne 404 actuellement)
- **Fix** : En attente d'investigation
- **Statut** : En cours

---

## PERF - Performance

*(Aucune issue pour l'instant)*

---

## Historique

| Date | Section | ID | Description |
|------|---------|-----|-------------|
| 2025-12-06 | UI | UI-001 | Ajout mode Split View drawer |
| 2025-12-06 | API | API-001 | Extractions factures incorrectes |
