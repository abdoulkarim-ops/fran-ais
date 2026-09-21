# Le Français avec Abdoul Karim : version installable

Contenu du dossier :

- `index.html` : l'application (33 leçons)
- `manifest.webmanifest` : nom, couleurs et icônes de l'appli
- `sw.js` : le mode hors-ligne
- `icons/` : les icônes
- `_headers` : réglages pour Netlify et Cloudflare Pages

## 1. Mettre l'appli en ligne (gratuit)

Le mode hors-ligne et l'installation ne marchent que sur une adresse **https://**.
Un fichier ouvert directement dans le téléphone reste utilisable, mais ne s'installe pas.

- **Netlify Drop** (le plus simple) : va sur app.netlify.com/drop et glisse tout le dossier. Tu obtiens une adresse https en quelques secondes.
- **GitHub Pages** ou **Cloudflare Pages** : mets les fichiers dans un dépôt, active la publication.

Garde tous les fichiers ensemble, au même niveau que `index.html`.

## 2. Tester sur téléphone

1. Ouvre l'adresse dans Chrome (Android) avec internet et laisse charger 10 secondes.
2. Va dans **Profil** : la carte « Installe l'appli » apparaît. Touche **Installer**.
3. Coupe les données mobiles et le wifi, puis ouvre l'appli depuis l'écran d'accueil. Elle doit fonctionner normalement.

Sur iPhone : Safari → bouton Partager → « Sur l'écran d'accueil ».

## 3. Publier une mise à jour

Change le numéro de version à deux endroits, puis republie tous les fichiers :

- `VERSION` en haut de `sw.js`
- `version` dans `APP` au début du script de `index.html`

Les élèves reçoivent la nouvelle version à l'ouverture suivante de l'appli.

## 4. Google Play (étape suivante)

Une fois l'appli en ligne en https, on peut l'emballer avec **PWABuilder** (pwabuilder.com) ou **Bubblewrap**. Il faut un compte développeur Google Play (25 $, une seule fois) et un fichier de vérification `assetlinks.json` placé sur le site.
