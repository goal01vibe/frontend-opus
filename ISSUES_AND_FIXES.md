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

*(Aucune issue pour l'instant)*

---

## PERF - Performance

*(Aucune issue pour l'instant)*

---

## Historique

| Date | Section | ID | Description |
|------|---------|-----|-------------|
| 2025-12-06 | UI | UI-001 | Ajout mode Split View drawer |
