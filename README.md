# CHADA DE NETA AICE (চাঁদা দে, নেতা আইছে!)

A browser-based 3D satirical market game with fictional characters and shops.

## Run in VS Code and Chrome

1. Install Node.js LTS (Node 20 or newer) from [nodejs.org](https://nodejs.org/).
2. If VS Code was already open during installation, restart it so its terminal can find Node and npm.
3. In VS Code, choose **File → Open Folder...** and open this project folder.
4. Open **Terminal → New Terminal** and run:

   ```powershell
   npm.cmd install
   npm.cmd run dev
   ```

5. Open the local URL printed by Vite (by default `http://127.0.0.1:5173/`) in Chrome.

Alternatively, after dependencies are installed, use **Terminal → Run Task → Run Vite Dev Server**.

To check the production bundle, run `npm.cmd run build`. Vite writes it to `dist/`.

If PowerShell says `npm.cmd` is not recognized, restart VS Code first. If it still cannot find Node, run this once in that terminal, then retry the commands above:

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
```

An internet connection is required to fetch the Hind Siliguri font. Three.js is installed locally through npm.

## Controls

- **W A S D** — move
- **Shift** — run
- **Space** — jump
- **E** — talk to a nearby shopkeeper
- **Right mouse button + drag** — rotate the third-person camera
- **Mouse wheel** — zoom
- **Esc** or the pause button — pause/resume
- **Touch joystick** — move on touch screens

## Project structure and dependencies

- `index.html` — page structure and Vite entry point
- `js/main.js` — game loop, player, input, camera, and HUD wiring
- `js/market.js` — procedural market, shop interactions, traffic, NPC routines/reactions, audio, and day/night cycle
- `css/style.css` — HUD and menu styling
- `vite.config.js` — local development server configuration
- `package.json` — Vite scripts and Three.js dependency
- `assets/models/player.glb` — optional skinned player model with embedded animation clips
- `d451f4e7-5c6b-4b45-8d84-b8247992713b.png` — supplied concept image; not loaded by the game
- `assets/models`, `assets/textures`, `assets/images`, and `assets/audio` — currently placeholders; no external model or audio is loaded

## Development status

Stage 1 provides the procedural market, third-person movement and camera, jump/run, a three-shop visit objective, pause menu, and touch joystick. Stage 2 provides an optional GLTFLoader/AnimationMixer path, graphics presets, and animation-state matching. **No player GLB is currently in the project**, so the game intentionally keeps its original playable placeholder until a valid model is supplied.

To test a character, put `player.glb` in `assets/models/` and restart Vite (or rebuild). The file must contain a skinned mesh and animation clips named `Idle` and at least one of `Walk`, `Run`, or `Sprint`. Additional recognized clips are `Sprint`, `Jump`, `Landing`/`Land`, `Turn`, and `Interact`/`Talk`/`Wave`. The HUD reports which clips were found and missing. An invalid or non-animated model does not replace the playable fallback.

Stage 3 adds seven Bengali-labeled shop categories, basic shopkeeper dialogue and opening hours, a small procedurally animated pedestrian crowd with density settings and simple routines, a security-guard response to scripted danger events, five moving vehicles with traffic spacing, generated market ambience/horns after Play is pressed, benches/stalls/trash bins/crossings, and a lightweight day/night cycle. It remains a compact prototype: NPCs use procedural placeholder meshes and simple sidewalk steering, the street is a short test market, and ambient/horn audio is synthesized rather than recorded.

To test a witness event from the browser console, run `window.dispatchEvent(new CustomEvent('game:danger',{detail:{position:{x:0,z:8},duration:7}}))`. NPCs nearby flee or respond; witnesses dispatch `market:police-notified` and `game:police-notified` events. This is only an event hook, not a police chase system. Press **E** near a shopkeeper to see the shop-specific greeting. Graphics quality and pedestrian density are selectable in the HUD.

The character stage is still waiting for a suitable licensed, likeness-appropriate rigged GLB and animation clips. Later work can replace procedural NPCs with optimized assets and add a real navigation mesh, vehicle path intersections, authored audio, and full world systems.

### Stage 3 verification and limits

The local Vite build succeeds. A browser smoke test confirmed the market loads without JavaScript errors, pedestrians and all five vehicles move, the three density choices produce 4/8/12 visible pedestrians, a scripted danger event makes nearby NPCs flee and a security guard respond, and NPCs can sit. WASD movement, mouse camera rotation, a jump and landing, shop collision, one **E** shop dialogue, the three-shop objective, quality controls, and pause/resume were also exercised. A short high-quality run measured about 75 FPS in the integrated browser; this is not a Chrome-wide or sustained-performance guarantee.

Remaining gaps: the player and NPCs are still simple procedural figures; the missing `assets/models/player.glb` means Stage 2's realistic character and skeletal animations are not present. NPC navigation and vehicle avoidance are approximate, police response is only an event hook, the market is a small test street, and audio is synthesized and has not been quality-tested. Open the Vite URL in Chrome and repeat the controls/interaction checks on the target PC before treating the prototype as a release. Stage 4 has not been started.
