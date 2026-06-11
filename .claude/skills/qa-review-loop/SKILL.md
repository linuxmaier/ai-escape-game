---
name: qa-review-loop
description: Orchestrate a single QA issue through its full lifecycle — a Fable design-review pass, a Sonnet implementation pass that opens a PR, a Fable PR-review pass, and a Sonnet responsive-changes pass — leaving the PR ready for the user's final review. Use when asked to "run the QA loop", "review and address a QA issue end-to-end", or to take a playtester issue from triage to a review-ready PR with design-lead oversight on both sides of implementation.
---

# qa-review-loop — design review ⇄ implementation, ending at a review-ready PR

You are the **orchestrator** (this is the main thread). You do not write the
design comments, the code, or the PR comments yourself — you sequence four
subagent passes and carry the artifacts between them. Two models do the work:

- **Fable** — design judgment. Plays design lead: reads the friction, weighs it
  against the game's vision (GDD.md, CLAUDE.md invariants), and writes the
  design-review comments. Used in Stage 1 and Stage 3.
- **Sonnet** — engineering. Implements the fix and the responsive changes.
  Used in Stage 2 and Stage 4.

The pipeline runs **autonomously** to a finished PR. It must **not** merge the
PR or clean up the worktree — that waits until the user confirms the merge (see
*Cleanup*). The argument is a single issue number (`$ARGUMENTS`).

Your job between stages: capture each pass's output (issue #, **PR #**, **branch
name**, **worktree path**, stance, summaries) and feed it forward. Subagents
start cold — they only know what you put in their prompt.

## Stage 0 — Resolve the issue

Confirm the issue exists and read it once for your own context:
`gh issue view $ARGUMENTS --json number,title,body,labels,comments`. If the issue
doesn't exist or the number is ambiguous, stop and ask the user.

If an **open PR already addresses this issue**, the implementation has been done
before — skip Stages 1–2 and resume at Stage 3 against that PR.

## Stage 1 — Design review (Fable) — skip if already done

First check for an existing design-review comment. In the comments you fetched in
Stage 0, look for one whose body begins with `**Design review` (the established
format used on issues #9/#11/#14/#16). If one exists, **skip this stage** and note
which comment you're reusing as the design-lead steer.

Otherwise spawn a **Fable** subagent with this brief:

> Act as the design lead for escAIpe. Read GitHub issue #$ARGUMENTS and all its
> comments (`gh issue view $ARGUMENTS --json number,title,body,labels,comments`).
> Separate what the playtester *experienced* (the real signal) from what they
> *suggested* (one possible fix). Explore the relevant level files, GDD.md, and
> the CLAUDE.md balance constants / design invariants to ground your read in the
> code. Commit to exactly one stance: **direct fix**, **alternative approach**,
> or **no change** (a valid, documented design decision). Then **post a comment
> on the issue** via `gh issue comment` in the established design-review format:
> open with a bold one-line stance summary (`**Design review — stance: …**`),
> then prose that is terse, code-grounded, names the specific files/functions,
> and cites GDD/CLAUDE.md sections where relevant — match the voice of the
> existing comments on issues #9 and #16. Do not write any code. Report back:
> the stance, and a 2–3 sentence summary of your guidance.

Capture the stance. **If the stance is "no change," stop the pipeline** and
report to the user — surface the rationale and let *them* decide whether to close
the issue. Do not auto-close and do not proceed to implementation.

## Stage 2 — Implementation (Sonnet) — open the PR

Spawn a **Sonnet** subagent with this brief:

> Read and follow the procedure in `.claude/commands/tackle-qa-issue.md` for
> issue #$ARGUMENTS, with two overrides:
> 1. **Run autonomously.** A design-lead review comment is already on the issue —
>    treat it as the high-signal steer the file's Step 2 describes. Form the plan
>    described in Step 4 internally, but do **not** enter plan mode or wait for
>    user approval — proceed straight to implementation.
> 2. **Stop after opening the PR (Step 7).** Do **not** do Step 8 — no merge, no
>    worktree removal, no branch deletion.
>
> Follow every CLAUDE.md convention, run `npm run check` (must be 0 errors) and
> `npm run smoke` where the file requires it, and fix any failures before
> finishing. Report back: the **PR number and URL**, the **branch name**, the
> **worktree path** (`.worktrees/…`), the stance taken, a summary of the
> approach, and the check/smoke results.

Capture PR #, branch, and worktree path — Stages 3–4 need them. Do **not** use
the Agent tool's `isolation: "worktree"` here; tackle-qa-issue creates and owns
its own worktree, which must persist on disk so the responsive pass can reuse it.

If the subagent lands on a "no change" outcome and opens no PR, stop and report.

## Stage 3 — PR review (Fable) — commentary on the implementation

Spawn a **Fable** subagent with this brief (pass it the PR number and issue
number):

> Act as the design lead reviewing PR #<PR> which addresses issue #$ARGUMENTS.
> Read the diff (`gh pr diff <PR>`), the PR body (`gh pr view <PR>`), the issue,
> and the design-review comment on the issue, plus the relevant GDD.md / CLAUDE.md
> sections. Judge whether the implementation actually resolves the friction the
> playtester reported **and** honors the design intent and the game's hard
> invariants (inspect/console voice contract, color discipline — cold red is
> oversight-only, balance constants, record-id annotations, INSPECT costs no
> tick). Identify anything still to address or any change to the approach. **Post
> your commentary as a PR comment** via `gh pr comment <PR>` in the design-lead
> voice. If the PR is already solid and needs nothing, say so explicitly (an
> approving comment). Do not write code. Report back: whether responsive changes
> are needed (yes/no) and a short summary of what you flagged.

## Stage 4 — Responsive changes (Sonnet) — only if Stage 3 asked for them

If Stage 3 reported nothing to address, **skip to Stage 5**.

Otherwise spawn a **Sonnet** subagent with this brief (pass PR #, branch,
worktree path):

> Make responsive changes to PR #<PR>. The work lives in the worktree at
> <worktree-path> on branch <branch> — `cd` into it. Read the latest design-lead
> review comment on the PR (`gh pr view <PR> --json comments`). Address each point
> it raises, following CLAUDE.md conventions; do not add unrelated changes. Re-run
> `npm run check` (0 errors) and `npm run smoke` if you touched engine or level
> logic. Commit and push to <branch> so the PR updates. Do **not** merge. Reply
> to the design-lead's PR comment with a brief note on what you addressed. Report
> back: what changed and the check/smoke results.

## Stage 5 — Hand off to the user

Report inline. Give: the issue title, the stance taken, the **PR number and URL**,
links (or pointers) to the design-review comment and the PR-review comment, what
the responsive pass changed (or "nothing flagged"), and the final check/smoke
status. State plainly: **the PR is ready for your final review; nothing has been
merged.** Then stop — wait for the user.

## Cleanup — only after the user confirms the merge

Do not run this until the user says the PR is merged. Then perform
tackle-qa-issue's Step 8 from the repo root:

1. `gh pr view <PR> --json state,mergedAt` — verify state is `MERGED`.
2. Kill any background dev-server processes started during the run.
3. `git worktree remove .worktrees/<branch>`
4. `git pull`
5. `git fetch --prune`
6. `git branch -d <branch>` (use `-D` as a fallback if the squash-merge blocks `-d`).

## Guardrails

- One issue per invocation.
- You orchestrate; you never author the design comments, the code, or the PR
  comments yourself — always delegate to the correct-model subagent.
- Always pass concrete artifacts forward (issue #, PR #, branch, worktree path).
  A subagent that isn't told the worktree path can't continue the work.
- The pipeline never merges and never cleans up on its own.
