# Task Commands

Use the following commands in uppercase to define the type and scope of an implementation task:

* `FTASK` - Implement or update the frontend feature itself. Do not create or update tests for the pages or components changed by the task, but run existing relevant checks when practical.
* `FTEST` - Create or update frontend tests for previously implemented pages and components. Do not add unrelated feature behavior.
* `BTASK` - Implement or update the backend feature itself. Do not create or update tests for the backend code changed by the task, but run existing relevant checks when practical.
* `BTEST` - Create or update backend tests for previously implemented backend features. Do not add unrelated feature behavior.

If a request asks to create or modify frontend or backend application code without one of these uppercase commands, pause before editing files and ask the user whether the task should use `FTASK`, `FTEST`, `BTASK`, or `BTEST`. Read-only questions, reviews, explanations, and planning requests do not require a task command.

## Instruction Understanding

Before planning or implementing a user instruction, analyze it and report the **confidence level percentage** that it is understood.

* If the confidence level percentage is 94% or below, ask the questions needed to clarify the instruction and improve understanding. Do not begin planning or implementation until the confidence level percentage reaches 95% or higher.
* If the confidence level percentage is 95% or higher, proceed with planning or reporting the proposed plan so the user understands the intended work before implementation.

## Investigation Scope

* Do not scan `node_modules`, `.venv`, `dist`, `build`, `logs/archive`, or generated files.
* Inspect only the files needed for the reported bug.
* Do not paste complete file contents unless the user asks.
* Summarize findings before opening additional files.
* Compact current findings into a short handoff note containing only facts needed to continue. Remove dead ends and repeated details.

## Response Style

* Be concise.
* Do not provide long explanations.
* Show only the patch and the reason.
* Do not restate the complete plan unless it has changed.

## Analysis Helpers

Use the project-local helpers when they provide the needed context with less output than manually inspecting the repository:

* `./scripts/repo-summary.ps1` - Compact repository structure, package, and Git context for an unfamiliar task.
* `./scripts/scan-errors.ps1 -Area frontend|backend|all` - Run non-writing TypeScript error scans for the requested application area.
* `./scripts/recent-changes.ps1` - Compact uncommitted-change and recent-commit context before modifying related files.

Read and report a helper's concise findings before opening further files. Do not use a helper when its output is unrelated to the current task.
