# sdd-lite Skill Catalog (Runtime Standards Registry)

Compact, delegable reference for the sdd-lite canonical skills as installed in this project.
This file is read by the orchestrator and by delegated stage workers; keep it terse and current.
Persisted in English regardless of chat language.

## Canonical Flow

`sddl-init` (bootstrap, one-time/refresh) -> `sddl-proposal` -> `sddl-spec` -> `sddl-design` -> `sddl-plan` -> `sddl-executor` (per approved stage) -> `sddl-code-review` and/or `sddl-qa-review` -> `sddl-delivery` -> `sddl-archive`.

`sddl-deep-explorer` and `sddl-judgment-day` are on-demand, non-linear support skills invoked by the orchestrator when needed, not part of the fixed sequence.

## Skill Table

| Skill | Stage | Input | Output | Trigger Heuristic |
|---|---|---|---|---|
| sddl-init | Bootstrap | repo evidence | `project-context.md`, `skill-catalog.md`, `openspec/config.yaml` | Bootstrap missing/stale, or AI wrapper/skill install requested |
| sddl-proposal | Framing | user request | `proposal.md` | First canonical stage after bootstrap; problem framing needed |
| sddl-spec | Specification | `proposal.md` | `spec.md` | Proposal accepted; scope/acceptance criteria need formalizing |
| sddl-design | Design | `spec.md` | `design.md` | Spec accepted; technical approach and interfaces need defining |
| sddl-plan | Planning | `design.md` | `plan.md` | Design accepted; ordered execution stages needed (planner-terminal) |
| sddl-executor | Execution | `plan.md`, approved stage | `execution-log.md` | One approved stage at a time; requires explicit user approval per stage |
| sddl-code-review | Review (4R) | frozen diff | `review-ledger.md` findings | On-demand after execution stage or standalone; Risk/Readability/Reliability/Resilience |
| sddl-judgment-day | Review (adversarial) | immutable code or planning target | findings (confirmed/suspect/escalated) | Never auto-routed; explicit high-stakes verification request |
| sddl-deep-explorer | Support (read-only) | material unknown | findings, no persisted artifact | Orchestrator needs bounded uncertainty reduction before routing |
| sddl-qa-review | QA | one execution stage or full change | `qa-report.md` | After execution stage (stage mode) or at closeout (final mode, only mode that can mark completed) |
| sddl-delivery | Delivery drafting | done work, change artifacts or commit range | commit/PR/ticket drafts | Work complete; needs commit message, PR description, or ticket content |
| sddl-archive | Archive closure | finished/planned/abandoned change | `archive-report.md` | Change finished or cleanup requested; single or batch mode |

## Delegation Heuristics (Claude Code)

- Delegate each stage via the native Agent tool with a fresh context; pass the compact handoff envelope as the prompt.
- Never use Skill or Task tools for stage delegation — Agent tool only.
- Parallelize only independent read-only work (e.g. `sddl-deep-explorer` beside a non-writing stage) or workers with fully disjoint write scopes.
- `sddl-code-review` lenses and `sddl-judgment-day` judges run as parallel read-only Agent workers; launch judgment-day judges in one batch, wait for both, never let one see the other's output.
- Review workers return `findings` only — the orchestrator (not the worker) writes `review-ledger.md`.
- Child workers must not launch further sub-agents; on out-of-scope discovery they return `partial`/`blocked` with `next_action`.
- If the Agent tool is unavailable, run stages inline, persist `state.yaml` after each stage, and state the degradation explicitly.

## Delegation Heuristics (Codex)

- Ask once per session for worker mode (`native-workers` recommended, or `inline-sequential`) alongside the `interactive`/`auto` execution-mode question; cache both for the session.
- `native-workers`: fresh Codex sub-agent per delegated stage, per phase not per file; disjoint-scope/read-only parallelism only; workers must not launch descendants.
- `inline-sequential`: run sequentially in the parent conversation, persisting each pass's `findings` before the next; note weaker judge blindness in the ledger.
- Review workers return `findings` only in both modes — the orchestrator writes `review-ledger.md`.

## Core Rules (Both Platforms)

- Run bootstrap preflight first; if `./sdd-lite/project-context.md`, `skill-catalog.md`, or `openspec/config.yaml` are missing or stale, stop and run `sddl-init`.
- Recover context from persisted artifacts (`project-context.md`, `openspec/changes/**`) before asking the user for facts already on disk.
- Persisted artifacts (proposal/spec/design/plan/execution-log/review-ledger/qa-report/archive-report/delivery drafts) stay in English; chat may be `es` or `en`.
- `interactive`/`auto` controls pause cadence between stages only — it never bypasses `stage_approval`, mandatory checkpoints, or approval gates for code-touching stages.
- `sddl-executor` requires explicit user approval before each individual stage; never batch-approve multiple stages implicitly.
- Only `sddl-qa-review` in final mode may mark a change completed.
- `sddl-archive` never deletes and never merges changes — disposition and reopen steps only.

## Canonical References

- Orchestrator contract: `<package-root>/orchestrator/SDDL-ORCHESTRATOR.md`
- Shared contracts: `<package-root>/skills/_shared/` (flow, persistence, review-ledger, user-interaction, project-standards)
- Schemas: `<package-root>/schemas/state.schema.yaml`, `<package-root>/schemas/config.schema.yaml`
- Artifact templates: `<package-root>/templates/artifacts/`
- Delivery templates: `<package-root>/templates/delivery/`

Where `<package-root>` = `sdd-lite` (this project's package root, project-relative).
