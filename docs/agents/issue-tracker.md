# Issue tracker: GitHub with Local Dual-Sync (TASKS.md)

This repository uses a **Dual-Sync Issue Tracker** model:
1. **Remote Cloud Layer**: **GitHub Issues** via `gh` CLI (holds parent/sub-issues, native blocking dependencies, and discussion comments).
2. **Local Dashboard Layer**: **[`TASKS.md`](../../TASKS.md)** at the repository root (provides a glanceable, offline-accessible dashboard of active epics, in-progress tasks, and closed deliverables).

Both sources of truth must remain strictly synchronized at all times.

---

## The Dual-Sync Invariant for AI Agents

Whenever an agent performs an action on GitHub Issues, it MUST synchronously update `TASKS.md` (and vice-versa):

1. **On Create**:
   - Create on GitHub: `gh issue create --title "..." --body "..."` (or with `--parent` / native blockers).
   - Immediately append a corresponding row in the appropriate section of `TASKS.md`.
2. **On Claim / Start**:
   - Assign on GitHub: `gh issue edit <number> --add-assignee @me`.
   - Update the status column in `TASKS.md` to 🟢 **In Progress** with the agent's active branch or assignee.
3. **On Resolve / Close**:
   - Comment & close on GitHub: `gh issue comment <number> --body "..."` and `gh issue close <number>`.
   - Update `TASKS.md`: mark status as ✅ **Done**, link the resulting artifact/spec/prototype, and move completed epics to the *Completed Milestones* section if closed.

---

## Fast Reading Seam

- **Quick Local Context**: Agents can read [`TASKS.md`](../../TASKS.md) to discover the active map, the current frontier of open unblocked tasks, and all closed deliverables without running shell commands.
- **Deep Issue Context**: When detailed conversation history or issue descriptions are required, fetch from GitHub via `gh issue view <number> --json number,title,body,labels,comments`.

---

## GitHub CLI Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --json number,title,body,labels,comments`.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Make an issue a sub-issue of a parent**: `gh issue create --parent <parent> ...`, or `gh issue edit <parent> --add-sub-issue <child>` (`gh` 2.94+). Without sub-issues, put `Part of #<parent>` at the top of the child body.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v`; `gh` does this automatically when run inside a clone.

---

## Pull requests as a triage surface

**PRs as a request surface: no.** *(Defaulted off)*

When set to `yes`, PRs run through the same labels and states as issues, using `gh pr view`, `gh pr diff`, `gh pr comment`, `gh pr close`.

---

## When a skill says "publish to the issue tracker"

1. Create a GitHub issue (`gh issue create ...`).
2. Add the corresponding task entry to `TASKS.md`.

## When a skill says "fetch the relevant ticket"

1. Check `TASKS.md` for immediate status and links.
2. Read the full issue via `gh issue view <number>`.

---

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: A single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. Mirror the map title and objective in `TASKS.md`.
- **Child ticket**: An issue linked to the map as a GitHub sub-issue (labels: `wayfinder:<type>`). Mirrored as a row under the map's section in `TASKS.md`.
- **Blocking**: GitHub's **native issue dependencies**:
  `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`
  where `<blocker-db-id>` is the blocker's numeric database id (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`). Mirror blocked status in `TASKS.md` (e.g. `🔒 Blocked by #9, #10`).
- **Frontier query**: The open, unblocked, unclaimed children. Represented as 🟢 **In Progress (Frontier)** in `TASKS.md`.
- **Claim**: `gh issue edit <n> --add-assignee @me`, the session's first write. Update assignee in `TASKS.md`.
- **Resolve**: Post resolution comment, close the issue, append a context pointer to the map's `Decisions so far`, and mark ✅ **Done** in `TASKS.md` with artifact link.
