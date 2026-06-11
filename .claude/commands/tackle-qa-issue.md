Tackle a playtester QA issue $ARGUMENTS end-to-end: interpret the feedback as a game designer, assess the right response, plan, implement, verify, and open a PR.

## Step 1 — Fetch the issue

Run `gh issue view $ARGUMENTS --json number,title,body,labels,comments` to read the issue. If the report is too vague to understand what the player experienced — no description of what happened, no indication of where in the game — stop here and ask the user for clarification before proceeding.

Note the issue's labels — they determine the branch prefix in Step 4 (`fix/` for bug, `feat/` for feature/enhancement, `refactor/` for refactor, `chore/` otherwise).

## Step 2 — Interpret the playtester report

Before touching any code, read the feedback carefully and separate two things:

**What the player experienced:** The actual friction, confusion, or feeling they had. This is the signal — it is almost always real and worth taking seriously, even if the player has described it imprecisely or emotionally.

**What the player suggested:** Their proposed fix. This is one possible response to what they experienced. It comes from a player's perspective, not a designer's, and may or may not be the right response.

Hold those two things apart as you move into the next step.

## Step 3 — Artistic assessment

You are acting as a game designer here, not just an engineer resolving a ticket. That means you carry two responsibilities simultaneously: to the player's experience (the feedback is a signal that something felt wrong and that matters) and to the vision of the game (not every friction is a mistake — some is intentional, and resolving it the wrong way can erode what makes the game work). Your job is to use judgment to balance those interests when they are in tension.

Explore the codebase — relevant level files, the GDD, the CLAUDE.md balance constants, the narrative design — to understand the context around what the player experienced. Read `GDD.md` if the issue touches on tone, pacing, or thematic intent. Then commit to one of three stances before proposing anything:

**1. Direct fix** — The player's suggested resolution is sound. Implementing it as described would improve the experience without meaningful cost to the game's vision. Proceed with their suggestion.

**2. Alternative approach** — The underlying friction is real and worth addressing, but the suggested fix would introduce a different problem: it might undermine an intentional design beat, flatten a moment that's supposed to have difficulty, reduce thematic coherence, or create a precedent that causes trouble elsewhere. Identify what the player actually needed and find a different path to it.

**3. No change** — The friction is intentional, or the cost of any fix outweighs its benefit. This is a valid outcome, not a dismissal. If you land here, you must be able to articulate specifically why the current design is the right call — what it is doing for the game that a change would sacrifice — and write that rationale clearly in the issue comment and PR. Closing a QA issue with "no change" is a design decision, and it should be documented like one.

Do not make any changes yet. Proceed to Step 4.

## Step 4 — Enter plan mode and propose a plan

Enter plan mode. Lead with your artistic assessment: state which stance you are taking and why, in a short paragraph. Then present:

**Implementation:** What you will change and why. Be specific about files, functions, and the nature of the change. If the stance is "no change," describe what you will write in the issue comment explaining the decision.

**Regression considerations:** Note whether the change could affect behavior covered by `npm run smoke`. If the smoke tests would catch a regression here, say so. If the change is purely cosmetic or narrative, note that explicitly.

**Documentation impact:** Note whether `CLAUDE.md` or `README.md` need updates. If balance constants or design invariants are changing, flag that. If no docs need updating, say so explicitly.

**Open questions:** Any decisions that require the user's input before proceeding. Disagreements about the artistic stance are especially important to surface here — if you are uncertain whether the stance is right, say so and explain the tension rather than resolving it silently.

**Verification steps:**

Separate into:
- *Automated checks (Claude will run):* lint (`npm run check`), smoke tests (`npm run smoke`) if the change touches engine or level logic, and any issue-specific checks.
- *Manual checks (user to verify):* This project is a browser narrative game, and most QA feedback ultimately requires a human to play through and feel whether the change resolved the friction. Be explicit about what the user should play and what they should be watching for — not just "does it work" but "does it feel right."

Wait for the user to approve the plan (and answer any open questions) before proceeding.

## Step 5 — Implement

Before making any changes:

1. Ensure `.worktrees/` is in the repo's `.gitignore`. If it isn't, add it.
2. Run `git checkout main && git pull` from the repo root.
3. Pick the branch prefix based on the issue's labels (from Step 1): `fix/` for bug, `feat/` for feature/enhancement, `refactor/` for refactor, `chore/` otherwise.
4. Create a worktree and branch: `git worktree add .worktrees/<prefix>issue-$ARGUMENTS -b <prefix>issue-$ARGUMENTS`.
5. Do all subsequent work from inside the worktree.

Make the changes described in the approved plan. Follow all conventions in `CLAUDE.md`. Do not add unrelated cleanup or refactors.

Commit messages must include `closes #$ARGUMENTS`. They should also capture the *design reasoning* behind the change — not just what changed technically, but why this was the right response to the feedback. A reader of the git history should be able to understand the artistic intent, not just the mechanical diff.

## Step 6 — Verify

Run automated checks in this order:

1. `npm run check` — must pass at 0 errors.
2. `npm run smoke` — run if the change touches engine logic, level files, or any behavior the smoke scripts exercise. Skip with an explicit note if the change is purely cosmetic or narrative-only.
3. Any issue-specific automated checks from the plan.

Fix any failures before continuing. Re-run checks after any post-implementation edit.

Then surface manual checks:

- Tell the user specifically which part of the game to play and what to pay attention to. Frame this as a playtest prompt, not just a checklist item — "play through the X path and notice whether Y moment still lands" is more useful than "verify the fix works."
- If the stance was "no change," there is nothing to play — but still ask the user to review the issue comment you will post before closing.

## Step 7 — Open a PR

If `CLAUDE.md` or `README.md` need updates (flagged in Step 4), make those now.

Open a PR with a clear title and summary. The PR body must include `closes #$ARGUMENTS`.

The PR body should include:
- A short paragraph on the **design rationale** — what stance was taken and why. This is what distinguishes a QA PR from a bug fix: future contributors need to understand the intent, not just the change.
- A verification checklist. Steps Claude completed should be pre-checked (`- [x]`); steps the user still needs to take should be unchecked (`- [ ]`).

## Step 8 — Post-merge cleanup

Wait for the user to confirm the PR has been merged.

Once confirmed, run `gh pr view <PR-number> --json state,mergedAt` to verify the PR is `MERGED`. Then, in order:

1. Kill any background dev-server processes by PID if you started one.
2. `cd` to the repo root.
3. `git worktree remove .worktrees/<prefix>issue-$ARGUMENTS`
4. `git pull`
5. `git fetch --prune`
6. `git branch -d <prefix>issue-$ARGUMENTS` (use `-D` as a fallback if squash-merge prevents `-d`).
