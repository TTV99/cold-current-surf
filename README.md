# Cold Current — browser surf time trial

**Play now:** [ttv99.github.io/cold-current-surf](https://ttv99.github.io/cold-current-surf/)

An original, dependency-free WebGL surf game with three selectable courses, banked ramps, first-person steering and mouse look, jumping, checkpoints, timer, settings, and local records. The visuals and code were independently created from publicly observable behavior; no proprietary assets or private server code are included.

## Controls

- **A/D** or arrow keys: pressure the left and right surf ramps
- **Mouse**: steer your line; click the game to capture/release the pointer
- **S**: brake; forward momentum comes from the course and ramps
- **Space:** jump
- **Mouse:** look (click the course to capture the pointer)
- **R:** restart; **Esc:** menu

## Run locally on Windows

1. Extract `surfd-remake.zip` and open its folder in VS Code.
2. Choose **Terminal → New Terminal** and run `npx serve .`.
3. Open the local address it prints (typically `http://localhost:3000`) in Chrome or Edge.

There is no build step or runtime dependency. The public source is at [TTV99/cold-current-surf](https://github.com/TTV99/cold-current-surf). Pushing changes to `main` redeploys through the included `.github/workflows/pages.yml` workflow.

## Records and online features

Personal records are stored locally in the current browser profile. They are not verified or shared. Accounts and global leaderboards need a backend and are not implemented in this build.
