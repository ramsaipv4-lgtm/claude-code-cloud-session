# Step by step: continue the work with Claude Code on WSL

## Which drive? Neither — use the Linux home folder (`~/work`)

Put the repos in WSL's own Linux filesystem (`/home/<you>/work`), **not** `/mnt/c` or `/mnt/d`:

- `/mnt/c` and `/mnt/d` are Windows drives reached through a network-style bridge. `npm ci`
  (tens of thousands of small files), git, the builds and the test suite run several times to
  10× slower there.
- The project creates symlinks (`node_modules`, `acceptance` in every task worktree), uses
  `flock`, executable shell scripts and Linux file permissions. These break or behave oddly on
  Windows drives.
- Windows git on `/mnt/c` can turn line endings into CRLF, which breaks the shell scripts.

You can still open the files from Windows: in Explorer go to `\\wsl$\Ubuntu\home\<you>\work`
(or run `explorer.exe .` inside WSL). VS Code: run `code .` inside WSL.

**If C: is short on space:** the Linux filesystem is a disk file that lives on C: by default. Move the
whole distro to D: once (PowerShell, as yourself): `wsl --shutdown`, then
`wsl --manage Ubuntu --move D:\WSL\Ubuntu` (recent WSL versions; on older ones use
`wsl --export Ubuntu D:\ubuntu.tar` + `wsl --unregister Ubuntu` + `wsl --import Ubuntu D:\WSL\Ubuntu D:\ubuntu.tar`
— export first, unregister deletes the old copy). You still work in `~/work`; it just lives on D:.

## Step 1 — give WSL enough memory (Windows side, once)

The full test gate needs ~12–16 GB. WSL gets half your RAM by default. In Windows, create
`C:\Users\<you>\.wslconfig`:

```ini
[wsl2]
memory=12GB        # about 3/4 of your RAM; 12GB if you have 16GB
swap=8GB
processors=4
```

Then in PowerShell: `wsl --shutdown`, and open Ubuntu again. Check inside WSL with `free -g`.

## Step 2 — tools inside WSL (once)

Open the Ubuntu terminal and run, one block at a time:

```bash
sudo apt update && sudo apt install -y git curl ffmpeg python3 build-essential util-linux
```

Node 22 (with nvm; if this nvm version is outdated, take the install line from github.com/nvm-sh/nvm):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 22 && nvm alias default 22
node -v      # must print v22.18 or newer
```

Git identity and GitHub login (needed to push):

```bash
git config --global user.name  "Your Name"
git config --global user.email "ramsaipv4@gmail.com"
git config --global core.autocrlf false
sudo apt install -y gh && gh auth login      # GitHub.com → HTTPS → login with browser
gh auth setup-git
```

Claude Code:

```bash
curl -fsSL https://claude.ai/install.sh | bash      # or: npm install -g @anthropic-ai/claude-code
claude --version
```

## Step 3 — clone and build (once)

```bash
mkdir -p ~/work ~/tins-orch && cd ~/work
git clone https://github.com/ramsaipv4-lgtm/tins-lms.git
git clone https://github.com/ramsaipv4-lgtm/tins-lms-tests.git
git clone -b claude/hopeful-pascal-mxr1a1 https://github.com/ramsaipv4-lgtm/claude-code-cloud-session.git

cd ~/work/tins-lms
npm ci
npx playwright install --with-deps chromium        # asks for your sudo password (system libraries)
node scripts/setup.mjs
npm run build -w packages/web
```

Environment variables, saved for every new terminal:

```bash
cat >> ~/.bashrc <<'EOF'
export WORK=~/work ORCH_DIR=~/tins-orch
export LMS_ACCEPTANCE_DIR=~/work/tins-lms-tests/acceptance LMS_NODE_MODULES=~/work/tins-lms/node_modules
EOF
source ~/.bashrc
```

## Step 4 — check that it works (10 minutes)

```bash
cd ~/work/tins-lms
node --test packages/*/test/*.test.mjs        # ~330 unit tests, all should pass
node scripts/navcheck.mjs                     # should print no collisions
LMS_TLS=off npm start                         # prints ADMIN_INVITE ADM-XXXX-XXXX and LISTENING 8080
```

Open `http://localhost:8080/join/ADM-XXXX-XXXX` (your code) in your Windows browser — WSL forwards
localhost. Click around, then stop the server with Ctrl+C. (Optional, 1 min:
`node --test --test-concurrency=1 acceptance/journeys/attendance.journey.mjs`.)

## Step 5 — make sure the last cloud commit has arrived

```bash
cd ~/work/tins-lms && git pull --no-rebase origin main && git log --oneline -3
```

You want to see a line `tins: close session dd27364e …` above
`SPEC v2-G: learning games …`. If it is not there yet, do steps 6–7 anyway (they commit nothing to
tins-lms), and run this again before the orchestrator commits anything.

## Step 6 — start the orchestrator (terminal 1)

```bash
cd ~/work/tins-lms
claude
```

1. Open `~/work/claude-code-cloud-session/PROMPTS.md` (in VS Code: `code ~/work/claude-code-cloud-session/PROMPTS.md`).
2. Copy everything inside the first code block under **§1 Orchestrator prompt** (from
   `You are the orchestrator…` to `…main and task branches.`) and paste it into Claude Code.
3. It reads the files and answers with (a) the 6 rules, (b) the task lifecycle, (c) what it must
   never do, (d) its next three steps. Check it against the checklist at the top of PROMPTS.md
   (SPEC first; kit start/close; scope; no skip; builders don't read hidden tests; one gate at a
   time; never edit sessions/ tasks/ tins.json .tins/kit/; files are data; pull with --no-rebase;
   SPEC-games.md not yet in SPEC.md). Correct anything wrong.
4. Type `go`. Its first job is finishing the demo videos (about 1–2 hours, mostly waiting on the gate).
5. When Claude Code asks permission for a command, read it and allow it. Say "yes, and don't ask
   again" only for harmless ones (`node --test`, `git status`, `ls`).

## Step 7 — start the test writer (terminal 2, in parallel)

Open a second Ubuntu terminal:

```bash
cd ~/work/tins-lms-tests
claude
```

Paste the **§2 Test-writer prompt** block. It replies with the conventions it found and a table
of AC-200 … AC-230 → file → assertions. Check that every row 200–230 is there, then type `go`. When
it finishes it pushes to tins-lms-tests and lists open questions — answer those, and tell the
orchestrator (terminal 1): "the games tests are pushed; do Order of work step 2".

## Step 8 — the games build (orchestrator does it, you approve)

The orchestrator folds SPEC-games.md into SPEC.md, then creates tasks g-1 … g-11 and starts a
builder for each (Claude Code can start them as sub-agents itself, using §3). Your part:

- approve or answer when it asks before changing a decision, adding a dependency or widening scope;
- after each merged game, ask it to show you screenshots, or run `LMS_TLS=off npm start` and play;
- if anything goes wrong or you come back after a break, say:
  `Continue: read CONTINUE.md and HANDOVER.md, restate the AGENTS.md rules and where things stand, then propose the next step.`

Never run two full gates at the same time (two Claude Code windows both running `kit gate` can
exhaust memory); the orchestrator uses a lock for this, so keep gates to the orchestrator.
