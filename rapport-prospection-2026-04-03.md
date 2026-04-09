# Rapport de prospection — 3 avril 2026

> Généré automatiquement par l'agent de prospection.
> **Action requise : valider ou modifier les emails avant envoi.**

---

## Récapitulatif

| # | Entreprise | URL | Statut |
|---|-----------|-----|--------|
| 1 | Coaching & Formation | cf-coaching-formation.com | En attente de validation |
| 2 | Trajectives | trajectives.com | En attente de validation |
| 3 | Groupe Grandir | grandir.fr | En attente de validation |

---

## 1. Coaching & Formation

**URL :** https://cf-coaching-formation.com/
**Contact :** contact@cf-coaching-formation.com
**Téléphone :** 06 09 888 365

### Audit technique

- **Bugs d'encodage (CRITIQUE) :** Visibles sur l'ensemble du site — menus, titres, corps de texte. Exemples constatés en direct : "ActualitÃ©s" dans le menu principal, "CO-Construisez le futur avec vos Ã©quipes", "crÃ©ativitÃ©", "Accompagnement Ã©tudiants", "dâ€™Ã©quipe", "compÃ©tences". Probablement une incompatibilité charset entre la base de données et l'affichage.
- **Balises H1 :** 4 sur la même page (doit en avoir 1 seul — mauvais signal SEO).
- **Carrousel/slider :** Présent en page d'accueil (jQuery `.carousel`, 3 sec interval) — pattern obsolète depuis ~2018.
- **Google Analytics :** Version Universal Analytics (UA-22902080-1) — ce service a été arrêté par Google en juillet 2023. Les données ne sont plus collectées.
- **Bandeau cookies :** jQuery cookieBar — non conforme RGPD (pas de vrai consentement opt-in).
- **Images :** 1 image sans attribut `alt`.
- **Meta description :** Présente ✓
- **Copyright :** © 2026 ✓ (à jour)
- **Technologie :** Pas WordPress (framework custom/CMS inconnu, jQuery)

### Analyse visuelle

Design typique 2012–2015 : palette terracotta/bordeaux, layout en 2 colonnes (contenu principal + sidebar "Services & prestations"), typographies sans hiérarchie claire. Le carrousel hero en plein écran ne dit rien de concret sur l'offre dans les 3 premières secondes. Les bugs d'encodage sont visibles dès le menu — impact immédiat sur la crédibilité perçue. Les CTAs "En savoir +" sont multiples mais peu engageants. Le site n'inspire pas un cabinet senior.

---

### Email généré

**Objet :** cf-coaching-formation.com — un souci visible dès le menu

---

Bonjour,

En faisant une veille sur les cabinets de coaching à Aix-Marseille, je suis tombé sur votre site. Le menu affiche "ActualitÃ©s" au lieu de "Actualités" — et le même problème se répète sur toute la page. C'est le genre de détail que vos prospects remarquent avant même de lire votre offre.

Je suis développeur web spécialisé coachs & consultants. Au-delà de la correction, je propose quelque chose que vos concurrents n'ont pas encore : un outil IA intégré au site qui qualifie automatiquement vos visiteurs en leads. Le prospect répond à quelques questions, l'IA génère un mini-bilan personnalisé — vous récupérez un contact chaud prêt à prendre RDV.

15 min pour vous montrer ?

Rodolph

---

**Statut :** En attente de validation

---

## 2. Trajectives

**URL :** https://www.trajectives.com/
**Contact :** contact@trajectives.com
**Téléphone :** +33 (0) 1 40 70 17 28

### Audit technique

- **Espace vide excessif :** Entre chaque section, le scroll est très long avant d'atteindre du contenu. La section entre "Qui sommes-nous" et les témoignages était entièrement blanche sur plusieurs hauteurs d'écran.
- **Proposition de valeur floue :** Le hero affiche "POUR UN NOUVEL ART DE DIRIGER" — inspirant, mais un dirigeant qui arrive pour la première fois ne sait pas en 5 secondes ce que fait Trajectives concrètement.
- **Copyright footer :** "2023 - Trajectives" — nous sommes en 2026, soit 3 ans de retard.
- **Image brisée :** 1 image avec src vide détectée dans le DOM.
- **Balises H1 :** 1 seule ✓ (correct)
- **Encodage :** Aucun bug ✓
- **Meta description :** Présente ✓
- **Technologie :** WordPress
- **Photos équipe :** Professionnelles, portraits bien réalisés ✓
- **CTAs :** "OFFRE ENTREPRISE", "OFFRE COACHS", "NOUS RENCONTRER" visibles au-dessus de la ligne de flottaison ✓

### Analyse visuelle

Design élégant, palette terre cuite / beige premium, identité visuelle cohérente. Le parti pris artistique est assumé. Cependant, le ratio contenu/espace vide pénalise la lisibilité mobile et le ressenti d'un visiteur pressé. La section entre "Qui sommes-nous" et les témoignages clients apparaît vide lors du scroll — probablement une animation CSS qui ne se déclenche pas correctement. Le copyright 2023 dans le footer donne une impression de site non maintenu, en contradiction avec la qualité visuelle du reste.

---

### Email généré

**Objet :** trajectives.com — un détail qui trahit le reste

---

Bonjour,

Je suis tombé sur trajectives.com en faisant une veille sectorielle. L'identité visuelle est soignée — mais le footer affiche encore "2023" alors qu'on est en 2026. Ce genre de détail saute aux yeux des dirigeants que vous ciblez.

En scrollant, il y a aussi une longue section blanche entre "Qui sommes-nous" et les témoignages — probablement une animation qui ne se déclenche plus correctement.

Je suis développeur web spécialisé coachs & cabinets de conseil. Au-delà de ces corrections, je propose un outil différenciant : un diagnostic IA intégré au site. Vos visiteurs répondent à quelques questions business, l'IA génère un bilan personnalisé — vous récupérez un lead qualifié avec ses données, sans que vous ayez à décrocher le téléphone.

15 min pour vous montrer le concept ?

Rodolph

---

**Statut :** En attente de validation

---

## 3. Groupe Grandir

**URL :** https://grandir.fr/
**Contact :** accueil@grandir-coaching-conseil.fr
**Téléphone :** 06 22 57 81 76

### Audit technique

- **Aucune balise H1 :** Zéro H1 sur la page d'accueil — problème SEO significatif pour un site WordPress. Google ne peut pas identifier le sujet principal de la page.
- **Section "Prochaines dates Solidités® : À venir" :** La section est affichée en page d'accueil sans aucune date. Impression de contenu abandonné, en décalage avec l'histoire de 30 ans du cabinet.
- **Sidebar WordPress :** Layout en 2 colonnes (contenu + sidebar "Actualités") — architecture datée pour un cabinet premium.
- **Carrousel équipe :** Slider de photos en haut de page (pattern obsolète).
- **Beaucoup de texte :** La page d'accueil est dense en texte, peu de visuels engageants pour illustrer les prestations.
- **Encodage :** Aucun bug ✓
- **Meta description :** Présente ✓
- **Copyright :** © Grandir 2026 ✓ (à jour)
- **Images :** Toutes les images ont un attribut `alt` ✓
- **Technologie :** WordPress

### Analyse visuelle

Le logo script "GrandiR" est distinctif et la palette rouge bordeaux est cohérente. La photo carousel d'équipe en tête de page est un point positif — elle humanise le cabinet. Mais l'architecture WordPress en sidebar rompt l'impression premium : elle range le contenu principal à gauche et des blocs "Actualités/Focus" à droite comme un blog générique. Le "Prochaines dates Solidités® : À venir" affiché sans dates donne l'impression que le site n'est plus maintenu. Pour un cabinet fondé en 1994 avec 2 000+ cadres accompagnés, le site ne transmet pas ce poids.

---

### Email généré

**Objet :** grandir.fr — 30 ans d'expérience, une page sans titre H1

---

Bonjour,

En faisant une veille sur les cabinets de coaching dirigeants, je suis arrivé sur grandir.fr. 1994, 2 000 cadres accompagnés — c'est solide. Mais votre page d'accueil n'a aucune balise H1 : techniquement, Google ne sait pas quel est le sujet principal de votre site.

La section "Prochaines dates Solidités® : À venir" est aussi toujours affichée sans date — ce genre de détail crée un doute chez le visiteur qui ne vous connaît pas encore.

Je suis développeur web spécialisé coachs & consultants. Au-delà de ces corrections, je propose un outil que vos concurrents n'ont pas encore : un diagnostic IA intégré au site. Vos prospects répondent à quelques questions, l'IA génère un bilan personnalisé basé sur votre méthode — et vous récupérez un lead qualifié prêt à prendre RDV.

15 min pour vous montrer ?

Rodolph

---

**Statut :** En attente de validation

---

## Notes méthodologiques

- Audit réalisé le 3 avril 2026 via navigation Chrome (screenshots + audit JavaScript + extraction du texte de page).
- Les emails respectent le format V2 (court, accroche factuelle, teaser IA, CTA unique).
- Aucun email n'a été envoyé. Ce rapport est soumis à validation de Rodolph avant tout envoi.
- Timing recommandé : mardi ou mercredi matin, 8h–10h. Relance J+4 si pas de réponse (1 seule relance).
