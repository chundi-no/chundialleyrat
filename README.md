# chundialleyrat.com

Le site de Chundi Alleyrat : bibliothèque personnelle, Explorer, inspirations, projets, présentation et CV.

## Modifier le site (au quotidien)

Tout se modifie dans l’administration, avec des champs à remplir : **chundialleyrat.com/admin**
(ou l’adresse Netlify du site suivie de `/admin` tant que le nom de domaine n’est pas relié).

1. Se connecter avec son compte GitHub (« Login with GitHub »).
2. Choisir une rubrique à gauche : Bibliothèque, Inspirations, Projets, Playlist, Pages et textes.
3. Ouvrir une fiche (ou « Nouvelle »), remplir les champs, ajouter des images ou des MP3.
4. Cliquer sur **Publier** → **Publier maintenant**. Le site est à jour pour tout le monde une à deux minutes plus tard.

Les propositions envoyées par les visiteurs (« Proposer une idée » dans la bibliothèque) arrivent dans Netlify, rubrique **Forms**, avec une notification par e-mail si on l’active.

## Mise en ligne (une seule fois)

### 1. Mettre le site sur GitHub
1. Créer un compte sur github.com si besoin.
2. Cliquer sur **+** → **New repository**. Nom : `chundialleyrat-site`. Public ou privé, au choix. Ne rien cocher d’autre. **Create repository**.
3. Sur la page du dépôt vide, cliquer sur **uploading an existing file**, puis glisser **tout le contenu** du dossier décompressé (les dossiers `admin`, `content`, `site`, et les fichiers `build.js`, `netlify.toml`, `README.md`, `.gitignore`).
4. **Commit changes**.

### 2. Publier avec Netlify
1. Créer un compte sur netlify.com avec **Sign up with GitHub**.
2. **Add new project** → **Import an existing project** → **GitHub** → autoriser Netlify → choisir `chundialleyrat-site`.
3. Les réglages sont déjà dans `netlify.toml` (commande `node build.js`, dossier `dist`). Cliquer sur **Deploy**.
4. Une minute plus tard, le site est en ligne sur une adresse du type `quelque-chose.netlify.app`.

### 3. Ouvrir l’administration (connexion GitHub)
1. Sur GitHub : photo de profil → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**.
   - Application name : `Administration chundialleyrat.com`
   - Homepage URL : l’adresse Netlify du site (puis chundialleyrat.com)
   - Authorization callback URL : `https://api.netlify.com/auth/done`
2. **Register application**, copier le **Client ID**, puis **Generate a new client secret** et le copier (il ne s’affiche qu’une fois).
3. Sur Netlify : le projet → **Project configuration** → **Security** (ou « Access & security ») → **OAuth** → **Install provider** → **GitHub** → coller le Client ID et le Client Secret → **Install**.
4. Ouvrir `https://quelque-chose.netlify.app/admin` → **Login with GitHub**.

### 4. Relier chundialleyrat.com
1. Netlify : **Domain management** → **Add a domain** → `chundialleyrat.com`.
2. Suivre les indications de Netlify chez le registraire du nom de domaine (OVH, Gandi, etc.) : soit changer les serveurs DNS pour ceux de Netlify, soit ajouter les enregistrements indiqués. Le HTTPS s’active tout seul.

### 5. Recevoir les propositions des visiteurs
Netlify : **Forms** → **Enable form detection**, puis **Deploys** → **Trigger deploy**. Dans **Forms** → **Form notifications**, ajouter son adresse e-mail.

## Pour information (technique)
- `content/` : tout le contenu, en fichiers JSON (c’est ce que l’administration modifie).
- `site/pages/` : les gabarits des pages ; `site/static/` : images, fichiers déposés (`uploads/`), React et le moteur des pages (`dc.js`).
- `build.js` : assemble le site dans `dist/` à chaque publication. Aucune dépendance à installer.
- `admin/config.modele.yml` : les champs de l’administration ; le dépôt GitHub est détecté automatiquement par Netlify.
