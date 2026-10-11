# Cold Current — browser surf time trial

**Play now:** [ttv99.github.io/cold-current-surf](https://ttv99.github.io/cold-current-surf/)

An original, dependency-free WebGL surf game with three selectable courses, a snowy ravine, paired glass-like ramps, a 3D surfer riding a shaped board, ramp-driven momentum, mouse look, jumping, checkpoints, timer, settings, and local records. The course layout and geometry are independently authored from public visual references; it does not include Surfd.net map files. The player model comes from the rigged Blender character supplied for this project, posed for surfing and exported as lightweight triangle geometry for the browser. The game starts in first person; press **V** to switch to the chase camera. No private server code is included.

## Controls

- **W/S** or up/down: build speed / brake
- **A/D** or left/right: pressure the surf ramps
- **Mouse**: look; click the game to capture/release the pointer
- **Space** or mouse wheel down: jump
- **Shift:** duck
- **V:** switch chase and first-person cameras
- **R:** restart; **Esc:** menu

## Player model

`surfer-character.json` is the game-ready mesh derived from the user-supplied `assets/surfer-character.blend`. The JSON is a compact list of colored 3D triangles, so the game can render the character with its existing WebGL code and no external runtime dependency. The Blender file is kept as the editable source model in the project ZIP.

## Run locally on Windows

1. Extract `surfd-remake.zip` and open its folder in VS Code.
2. Choose **Terminal → New Terminal** and run `npx serve .`.
3. Open the local address it prints (typically `http://localhost:3000`) in Chrome or Edge.

There is no build step or runtime dependency. The public source is at [TTV99/cold-current-surf](https://github.com/TTV99/cold-current-surf). Pushing changes to `main` redeploys through the included `.github/workflows/pages.yml` workflow.

## Records and online features

Personal records are stored locally in the current browser profile. They are not verified or shared. Accounts and global leaderboards need a backend and are not implemented in this build.
