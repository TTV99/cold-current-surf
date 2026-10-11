# Cold Current — browser surf time trial

An original, dependency-free browser game inspired by publicly observable surf-game controls and flows. All visuals and source code in this project are independently created. It does not contain extracted game code or proprietary assets.

## Included

- Perspective-rendered 3D-style alpine course scene and three selectable courses.
- WASD/arrow movement, mouse look, jumping, ramps, speed, timer, checkpoints, restart, and finish state.
- Settings for sensitivity, field of view, auto bunnyhop preference, and FPS display.
- Per-browser local records stored in `localStorage`.
- Accessible menu buttons and responsive layout.

## Run on Windows with VS Code

1. Install [Node.js LTS](https://nodejs.org/) and [Visual Studio Code](https://code.visualstudio.com/). No account or paid software is needed.
2. Extract `surfd-remake.zip` to a folder you can edit.
3. In VS Code, choose **File → Open Folder…** and select the extracted `surfd-remake` folder.
4. Open **Terminal → New Terminal**. From that folder, run:

   ```powershell
   npx serve .
   ```

5. Open the local address printed by the command (typically `http://localhost:3000`) in Chrome or Edge. If prompted, allow `npx` to download the small free static-file server package. Alternatively, install the free **Live Server** VS Code extension, right-click `index.html`, and select **Open with Live Server**.
6. Press **Drop in**. Click the scene to capture the mouse. Press **Esc** to return to the menu. Use **R** to restart; use **W/A/S/D** or arrows to steer and accelerate, **Space** to jump, and the mouse to look.

The project has no build step or runtime library dependencies. It runs as static files. A GitHub Pages workflow is included at `.github/workflows/pages.yml`.

## Publish on GitHub Pages

GitHub Pages can publish this folder as a shareable public website. A GitHub account and repository are required; the game itself does not require players to sign in.

1. Sign in to GitHub (or create an account yourself if you do not have one).
2. Create a **public** repository named `cold-current-surf`.
3. In VS Code, open the extracted `surfd-remake` folder. Initialize Git with **Source Control → Initialize Repository**.
4. Stage all files, commit with a message such as `Add Cold Current surf game`, then use **Publish Branch** and select the new `cold-current-surf` repository. Make sure you publish the files at the repository root, including the `.github/workflows/pages.yml` file.
5. In the GitHub repository, open **Settings → Pages**. Under **Build and deployment**, choose **GitHub Actions** as the source.
6. Open **Actions** and wait for **Publish game to GitHub Pages** to finish. GitHub displays the public link under **Settings → Pages**. It will usually look like `https://YOUR-USERNAME.github.io/cold-current-surf/`.

The workflow republishes the site whenever you push changes to `main`. GitHub Pages publishes the site publicly, so repository files are public too. GitHub's setup and publishing behavior is documented in its [Pages guide](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

## Accounts and online leaderboards

This build is intentionally local-only. Records live in the current browser profile and are not verified or shared. Account creation, secure identity, anti-cheat validation, and global leaderboards need a backend service and deployment credentials; no service or account was configured. The user interface labels local records accurately. For a future online version, add an API-backed account/session layer, server-validated run submissions, and a leaderboard endpoint without trusting client-provided times.

## Project files

- `index.html` — menu, HUD, settings, records, and finish panels.
- `style.css` — responsive interface styling.
- `game.js` — original rendering, movement, timing, course state, and local storage.
