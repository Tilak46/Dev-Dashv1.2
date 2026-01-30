# design: Workspace Automation & Port Hunter

## 1. 🛡️ Port Hunter (Revised)

**Placement:** Main Dashboard Header (Next to "Add Project" / "New Group").
**UI Component:** Shadcn `Sheet` (Slide-over panel from the right).

### Features

- **Trigger:** "Pulse" icon button with status color (Green = Clean, Red = Conflicts Detected).
- **The Sheet View:**
  - **Header:** "Active Port Scanner".
  - **List:** Ports that are actually being listened on by the projects currently running inside DevDash.
  - **Row Details:** Port | Project Name | PID.
  - **Actions:** "Stop" per row (stops that DevDash project only).
  - **Footer:** "Nuke Node.js" stops only DevDash-tracked projects (does NOT kill unrelated Node apps).

---

## 2. 🌌 "God-Mode" Workspaces (Zen Mode on Steroids)

**User Vision:** "Snapshot" the entire OS state (Browser tabs, VS Code, Apps) and restore it exactly.
**Technical Reality Check:**

- _Can we see open browser tabs?_ **No**. Browsers (Chrome/Edge) do not expose currently open URLs to other apps for security. We cannot "save" your current tabs automatically.
- _Can we see VS Code state?_ **Partially**. We can see the process, but not exactly which files are open unless strictly defined via CLI arguments.
- _Can we "Close everything"?_ **Yes**, but it's dangerous. Force-quitting apps can lose unsaved work.

### Proposed Solution: "Defined Launcher Profiles"

Instead of "Magical Snapshotting" (which is flaky), we build a **"Workspace Composer"**. The user defines exactly what a "Work Session" looks like, and we automate the startup/teardown.

### Workflow

1.  **Create Workspace:** User names it (e.g., "DevDash Frontend").
2.  **Add "Apps" (The Stack):**
    - **VS Code:**
      - _Dropdown:_ Select from existing Projects OR `.code-workspace` files known to DevDash.
      - _Action:_ "+ Add New Project/Workspace" button if missing.
    - **Browser:** Dropdown to select Browser (Chrome/Edge/Firefox) + List of URLs to open.
    - **Apps (Smart Select):**
      - _Scan Desktop:_ Allow user to pick from `.lnk` (shortcuts) found on their Desktop.
      - _Common Apps:_ Pre-defined list of detected common tools (Postman, Docker, Slack, Spotify, Discord).
      - _Manual Fallback:_ File picker for `.exe` or `.lnk` if not found.
3.  **The "Launch" Button:**
    - DevDash executes a sequence:
      1.  Opens the selected Project in VS Code (`code <path>`).
      2.  Opens the chosen Browser with the tab list.
      3.  Starts the Project's dev command (if configured).
      4.  Launches the selected external apps via their shortcuts.
4.  **The "Teardown" Button:**
    - Stops the Dev Server.
    - Closes the tracked VS Code window (via `code --terminate` if interface allows, or manual).
    - (Optional) Kills the specific browser process started by DevDash.

### UI Experience ("Hell Yeah this is my workspace")

- **Placement:** New **"Workspaces"** entry in the Sidebar (icon: `Layers` or `MonitorPlay`).
- **Main View:** A high-end Grid of "Workspace Cards".
  - _Design:_ Larger than project cards. Dark glass background.
  - _Content:_ Workspace Name, Icon (Frontend/Backend/Thinking), and a list of "Included Apps" (Icons of VS Code, Chrome, Spotify).
- **Hero Mode:** Clicking a workspace dims the lights (Zen Mode effect).
- **Animation:** A "System Booting..." sequence checks off items as they launch.

### Improvised "Auto-Save" Feature (The "Snapshot" approximation)

We can add a listener that "remembers" what you opened _through DevDash_.

- If you open a new project via DevDash, it gets added to the "Current Session".
- When you click "Save Workspace", we save that list.
- We _cannot_ see tabs you opened manually in Chrome, but we _can_ ask you to paste a "Session Link" or drag references in.

---

## 3. Implementation Roadmap

### Phase 1: Port Hunter (Immediate)

- [ ] Add `Sheet` component to renderer.
- [ ] Build `PortHunter` component with `process-list` or `cross-port-killer` logic.
- [ ] Add trigger button to Dashboard Header.

### Phase 2: Workspace Data Model

- [ ] Define `Workspace` interface (apps, urls, commands).
- [ ] Create generic "Launcher" service (handles `child_process.spawn` for various OS apps).

### Phase 3: Workspace UI

- [ ] Create "New Workspace" Wizard.
- [ ] Build the "Boot Sequence" overlay.
