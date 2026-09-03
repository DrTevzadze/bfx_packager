# BFX Packager

Cross-platform desktop utility that prepares BadEdits content folders for distribution.

This app lives at `badedits_utils/bfx_packager/`. The existing CLIs stay as sibling folders and are the source of pipeline logic.

Merges **`remove_artifacts`** (dot-underscore / `.DS_Store` cleaner) and **`badedits_encryption`** (AES-256-GCM encrypt of `.json` / `.jsx`), then packages each folder as a `.bfx` archive.

> **Status:** GUI shell only. No processing pipeline wired up yet — review the UI before implementing logic.

---

## Goal

Give users a simple drop-folders GUI that runs this pipeline **per folder**:

1. **Clean** — run `remove_artifacts` (delete `._*` and `.DS_Store` recursively)
2. **Encrypt** — run `badedits_encryption` on eligible `.json` / `.jsx` files
3. **Compress** — zip the processed folder
4. **Rename** — change the zip extension to `.bfx`

Platforms: **Windows** and **macOS**.

---

## Source tools (existing)

| Tool | Location | Role |
|------|----------|------|
| Artifact cleaner | `../remove_artifacts/dot-underscore-cleaner/` | Recursively removes `._*` and `.DS_Store` |
| Encryption CLI | `../badedits_encryption/` | AES-256-GCM encrypt/decrypt for `.json` / `.jsx` (embedded key or `--key`) |

Logic from these projects should be **ported/imported into this app**, not shell-invoked as a long-term dependency on separate CLIs (CLIs can remain available for power users).

---

## Planned pipeline (per dropped folder)

```
[Folder A] ──► Clean ──► Encrypt ──► Zip ──► Rename to FolderA.bfx
[Folder B] ──► Clean ──► Encrypt ──► Zip ──► Rename to FolderB.bfx
...
```

### Step details

1. **Clean (`remove_artifacts`)**
   - Walk the folder tree (skip symlinks).
   - Delete files named `.DS_Store` or starting with `._`.
   - Report how many files were removed.

2. **Encrypt (`badedits_encryption`)**
   - Find `.json` / `.jsx` files under the folder (exact scope TBD — see Open questions).
   - Encrypt with AES-256-GCM using the same approach as `badedits_encryption` (embedded key by default).
   - Produce `.enc` outputs; decide whether originals are kept or replaced (see Open questions).

3. **Compress**
   - Zip the processed folder contents into `<folder-name>.zip`.
   - Output location: same parent directory as the source folder (default), or a user-chosen output dir later.

4. **Rename**
   - Rename `<folder-name>.zip` → `<folder-name>.bfx`.

### Batch behavior

- User can drop **multiple folders**.
- Process sequentially (safer for disk I/O and clearer progress), or with limited concurrency later.
- Show per-folder status: queued → cleaning → encrypting → zipping → done / failed.
- Failures on one folder should not cancel the rest (log error, continue).

---

## GUI requirements

### Must have (v1)

- Cross-platform desktop window (Electron).
- Large **drop zone**: drag & drop folders (and browse/select folders).
- List of queued folders with remove action.
- Primary **Process** action (disabled until folders are added).
- Progress / log area for status messages.
- Brand: **BadEdits** as a strong identity signal in the first view.

### Explicitly out of scope for current GUI pass

- No real clean / encrypt / zip / rename.
- No file-system writes beyond what Electron needs to open the window.
- UI may use mock/demo interactions (add fake rows, animate idle states) only if helpful for review — prefer static-looking interactive chrome without side effects.

---

## Tech plan

| Layer | Choice | Notes |
|-------|--------|--------|
| Desktop shell | Electron | Native folder drop + Win/macOS packaging |
| UI | React + TypeScript + Tailwind (Vite) | Renderer in `src/`; Electron hosts the window |
| Cleaner | Port from `../remove_artifacts/dot-underscore-cleaner` | Shared module under `src/lib/` |
| Crypto | Port from `../badedits_encryption/src` | Reuse AES-GCM helpers |
| Zip | Node (`archiver` or `yazl`) or built-in approach | Cross-platform zip |
| Packaging | `electron-builder` | Produce `.exe` / `.dmg` later |

### Suggested layout (target)

```
badedits_utils/
├── badedits_encryption/      ← existing encrypt CLI
├── remove_artifacts/         ← existing cleaner
├── badedits_update/          ← unrelated sibling
└── bfx_packager/             ← this app
    ├── README.md
    ├── package.json
    ├── electron/
    │   ├── main.js
    │   └── preload.js
    ├── index.html
    ├── vite.config.js
    └── src/                  ← React + TypeScript UI (pipeline logic later)
        ├── main.tsx
        ├── App.tsx
        ├── types.ts
        ├── index.css
        ├── components/
        ├── hooks/
        └── utils/
```

---

## Implementation phases

### Phase 0 — GUI review

- [x] Document plan in README
- [x] Scaffold Electron app
- [x] Styled GUI: drop zone, folder list, process CTA, log panel

### Phase 1 — Wire drop / browse

- [x] Accept real folder paths via drag-drop and native folder picker
- [x] Display real folder names / paths in the list

### Phase 2 — Pipeline (in progress)

- [x] Clean — remove `._*` and `.DS_Store` via **Clean artifacts**
- [ ] Encrypt → zip → `.bfx` rename
- Per-folder progress + error handling
- Activity log in the UI

### Phase 3 — Polish & ship

- Cancel / clear queue
- Optional output directory
- [x] electron-builder for Windows + macOS distributables
- Smoke tests on both OS

---

## Open questions (resolve before Phase 2)

1. **Encrypt scope:** all `.json`/`.jsx` recursively, or only specific filenames/paths?
2. **Originals after encrypt:** keep plaintext beside `.enc`, delete plaintext, or overwrite in place?
3. **Zip root:** zip the folder itself (one top-level dir inside the archive) or zip its contents?
4. **Output path:** next to source folder, or always into a chosen “Output” directory?
5. **`.bfx` meaning:** rename-only (still a zip under the hood), or any extra header/format later?
6. **Decrypt / unpack:** in-scope for this app later, or separate tool?

---

## Agent notes

- Prefer porting existing cleaner + crypto code into `src/` rather than spawning the old CLIs.
- Keep Win/macOS path handling (`path`, no hard-coded separators).
- Do not implement pipeline until folder intake is confirmed working.
- Match the visual language established in `src/` when adding new UI chrome.
- Secrets: encryption uses the existing embedded-key approach from `badedits_encryption`; do not commit alternate production keys in plaintext beyond what that project already does.

---

## Dev (GUI preview)

From `bfx_packager/`:

```bash
npm install
npm start
```

Starts Vite, then opens the Electron window with the React UI.

## Package (Windows / macOS)

Build the renderer, then run electron-builder:

```bash
# Windows installer (.exe) — run on Windows
npm run pack:win

# macOS disk image (.dmg) — run on macOS only
npm run pack:mac

# Both (only works when the host OS can target each platform)
npm run pack
```

Output goes to `release/`:

- `BFX Packager-<version>-win-x64.exe` — Windows NSIS installer
- `BFX Packager-<version>-mac-x64.dmg` / `-mac-arm64.dmg` — macOS (unsigned unless you configure signing)

Unsigned macOS builds require **Right-click → Open** the first time (Gatekeeper). For distribution, add Apple code signing + notarization later.

App icon: `build/icon.png` (electron-builder generates `.ico` / `.icns` from it when packing).
