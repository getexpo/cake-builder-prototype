# Scheduler Diagnostics - OpenClaw Cron Investigation

## Goal
Record the actual scheduler blocker cleanly so execution can continue without pretending cron is already working.

## What was attempted
Commands attempted from the workspace shell:
- `openclaw cron list`
- `openclaw cron --help`
- `openclaw help`
- `openclaw status`

## Actual behavior observed
Instead of returning normal output, these commands hung until the surrounding exec session was killed.

Observed pattern:
- command starts
- no normal stdout payload comes back
- session remains alive
- exec eventually ends with SIGKILL from the environment

## What this means
The scheduler task is not safely creatable from the current shell path until the underlying OpenClaw CLI responsiveness issue is resolved.

This is different from:
- command syntax being wrong
- missing docs
- missing cron feature

The docs do show the expected cron command surface.
The blocker is runtime behavior in this environment.

## Evidence already gathered
Local docs confirm expected commands such as:
- `openclaw cron add`
- `openclaw cron list`
- `openclaw cron runs --id <jobId>`
- `openclaw cron edit <jobId>`
- `openclaw cron remove <jobId>`

Additional runtime evidence:
- Gateway health endpoint responds at `http://127.0.0.1:18789/health` with `200 {"ok":true,"status":"live"}`
- So Gateway is alive, but CLI commands still hang
- Attempting an assumed cron path directly at `/cron/status` returned the Control UI HTML shell, which means the raw cron HTTP route is not yet identified from this environment and should not be guessed

## Most likely next debugging steps
1. Verify Gateway daemon health outside the hanging shell path.
2. Check whether the CLI is waiting on an interactive state or blocked service connection.
3. Inspect OpenClaw logs around CLI invocation.
4. Retry cron creation only after normal `openclaw help` or `openclaw status` returns.

## Safe temporary stance
- Continue backend/product execution.
- Keep scheduled review task marked in progress or blocked until real cron creation and verification succeed.
- Do not claim automation is working without a real created job and a verified run history.
