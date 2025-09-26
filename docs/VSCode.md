# VS Code + Codex setup

Ces notes expliquent comment démarrer CRAutomatique2 directement depuis VS Code et comment brancher l'extension Codex pour piloter l'environnement local.

## Prérequis

1. **Dépendances** – L'exécution initiale de `./install.sh` (ou `install.ps1` sous Windows) installe Node.js, les modules NPM et les binaires annexes. Si votre machine est déjà configurée, aucune action supplémentaire n'est nécessaire.
2. **Variables d'environnement backend** – Copiez `backend/.env.example` en `backend/.env` puis complétez au minimum `PORT`, `DATA_ROOT`, `FFMPEG_PATH` et, si vous utilisez l'API OpenAI, `OPENAI_API_KEY`/`WHISPER_PATH`.
3. **URL côté frontend** – Créez `frontend/.env.local` avec `VITE_BACKEND_URL=http://localhost:4000` pour forcer Vite à cibler l'API locale par défaut.

## Tâches VS Code

Le fichier [.vscode/tasks.json](../.vscode/tasks.json) expose six tâches prêtes à l'emploi :

| Tâche | Description |
| --- | --- |
| `Backend: npm install` | Installe les dépendances backend. |
| `Frontend: npm install` | Installe les dépendances frontend. |
| `Backend: dev` | Lance `npm run dev` (watch TSX) avec logs dans le terminal partagé. |
| `Frontend: dev` | Lance `npm run dev` (Vite) avec logs dans le terminal partagé. |
| `Dev: backend+frontend` | Démarre les deux serveurs en parallèle (utilisé comme pré-tâche des configurations de debug). |
| `Backend: test` | Exécute la suite de tests backend (`npm test`). |

### Utilisation

- `Terminal → Run Task…` permet de lancer individuellement les scripts `dev`, `build` ou `test`. Les tâches `dev` sont configurées en mode *background* pour rester actives pendant l'exécution.
- Le raccourci `Ctrl+Shift+P` → `Tasks: Run Task` → `Dev: backend+frontend` démarre API + UI en un clic. Les sorties sont regroupées dans un unique panneau de terminal partagé.

## Débogage

Le fichier [.vscode/launch.json](../.vscode/launch.json) fournit deux configurations ainsi qu'un *compound* :

1. **API: npm run dev (inspect)** – Démarre le backend via `npm run dev` en injectant `NODE_OPTIONS=--inspect` afin d'ouvrir le port d'inspection Node (utile pour placer des points d'arrêt TypeScript). Les variables de `backend/.env` sont automatiquement chargées.
2. **Brave: Vite UI** – Ouvre l'interface sur `http://localhost:5173` dans Brave, lance la tâche `Frontend: dev`, isole la session dans un profil dédié (`.vscode/.brave-debug-profile`) et active un journal de trace détaillé. Vous pouvez modifier `runtimeExecutable` si vous utilisez un autre navigateur basé sur Chromium.

3. **CRAuto: dev (backend+frontend)** – Combine les deux configurations ci-dessus et déclenche la tâche `Dev: backend+frontend` avant d'attacher les débogueurs.

### Séquence type

1. `Ctrl+Shift+P` → `Tasks: Run Task` → `Dev: backend+frontend` (ou lancez directement le compound, qui exécutera cette tâche automatiquement).
2. Onglet **Run and Debug** → sélectionnez *CRAuto: dev (backend+frontend)* → ▶️. VS Code démarre le backend en mode inspecteur, lance le frontend, ouvre Brave avec DevTools et attache le débogueur navigateur.
3. Les terminaux restent ouverts pendant toute la session et relayent les erreurs (ports occupés, exceptions, erreurs Vite…).

## Intégration Codex

Pour permettre à Codex de piloter ces workflows :
1. **Autoriser l'exécution de commandes VS Code** – Ouvrez `Fichier → Préférences → Paramètres` puis recherchez « Codex ». Dans la section **Extensions → ChatGPT / Codex**, activez **Allow Command Execution** (si le basculement est visible). Sur certaines versions pré-release l'option est absente : dans ce cas, passez simplement à l'étape suivante, l'extension est déjà autorisée à invoquer les commandes VS Code.
2. **Associer les prompts aux commandes VS Code** – Dans Codex, utilisez `Ctrl+Shift+P` → `Codex: Run VS Code Command` (ou la fonctionnalité « Custom Actions » selon la version) et mappez chaque prompt `.codex/prompts/*.txt` vers :
   - `workbench.action.tasks.runTask` avec l'argument `Backend: dev`, `Frontend: dev`, `Dev: backend+frontend` ou `Backend: test` ;
   - `workbench.action.debug.start` avec la configuration `CRAuto: dev (backend+frontend)` ou directement `Brave: Vite UI` pour ouvrir/fermer Brave en mode trace.
3. **Partager les journaux** – Les tâches se lançant dans le terminal intégré (mode `panel: "shared"`), Codex voit exactement les mêmes sorties que vous. Il peut donc diagnostiquer un port bloqué, un crash Vite ou relayer les erreurs TypeScript/Node.

4. **Modification de code** – Une fois les tâches actives, Codex peut appliquer des changements locaux (via Git) tout en conservant les serveurs en fonctionnement. Pensez à lui fournir le contexte (`.vscode/tasks.json`, `.vscode/launch.json`, fichiers ouverts) pour des suggestions précises.

## Dépannage rapide

- **Port 4000 déjà utilisé** – Fermez les instances restantes ou modifiez `PORT` dans `backend/.env`, puis relancez `Dev: backend+frontend`. Mettez à jour `VITE_BACKEND_URL` en conséquence.
- **Frontend ne cible pas la bonne API** – Vérifiez `frontend/.env.local` et, côté Codex, assurez-vous que les commandes de lancement exportent la même variable.
- **Codex ne voit pas les logs** – Confirmez que l'extension a accès au terminal et que les tâches sont lancées via `runTask`. Si besoin, reconfigurez la sortie des tâches avec `panel: "shared"` (déjà défini) pour simplifier la lecture.

Avec cette configuration, VS Code et Codex utilisent exactement les mêmes scripts NPM que ceux fournis par le dépôt, ce qui garantit un comportement identique entre les lancements manuels, automatisés ou assistés par l'IA.
