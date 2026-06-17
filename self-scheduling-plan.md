# Self-Scheduling Plan - Cake Platform Work

## Goal
Set up recurring OpenClaw tasks so work can continue and report progress without waiting for manual follow-up.

## Intended recurring tasks
### 1. Cake platform progress sweep
Purpose:
- review `cake-builder-prototype/task-tracker.csv`
- continue the highest-value unfinished backend/product item
- log progress back into tracker and memory

Suggested schedule:
- every 30 minutes during working hours
- timezone: `America/Vancouver`

Suggested command:
```bash
openclaw cron add \
  --name "cake-platform-progress-sweep" \
  --cron "0,30 9-18 * * *" \
  --tz "America/Vancouver" \
  --session current \
  --system-event "Continue the cake platform work from the tracker. Do the next highest-value unfinished item, update tracking, verify what you can, and send a concise progress update only when there is real progress." \
  --wake now
```

### 2. Backend verification sweep
Purpose:
- check backend health endpoints
- catch broken local ports or wrong running service
- update tracker/notes if backend state changes

Suggested schedule:
- every hour
- timezone: `America/Vancouver`

Suggested command:
```bash
openclaw cron add \
  --name "cake-platform-backend-health" \
  --cron "15 * * * *" \
  --tz "America/Vancouver" \
  --session isolated \
  --message "Check the cake-platform-backend local health and current verified endpoints, document any breakage or drift, and report only meaningful findings." \
  --no-deliver
```

### 3. End-of-day checkpoint
Purpose:
- summarize what changed
- mark blocked items clearly
- prepare next starting point

Suggested schedule:
- daily at 6:30 PM Vancouver time

Suggested command:
```bash
openclaw cron add \
  --name "cake-platform-eod-checkpoint" \
  --cron "30 18 * * *" \
  --tz "America/Vancouver" \
  --session current \
  --system-event "Do an end-of-day checkpoint for the cake platform project. Update tracker, write memory notes, summarize completed work, open issues, and the next best starting point." \
  --wake now
```

## Current blocker
The real OpenClaw CLI scheduler path is hanging in this environment when attempting commands like:
- `openclaw cron list`
- `openclaw cron --help`
- `openclaw help`
- `openclaw status`

So these are prepared task specs, but not yet safely created jobs.

## Creation rule
Do not claim these tasks are active until all three are true:
1. `openclaw` CLI responds normally
2. cron jobs can be created successfully
3. `openclaw cron list` and `openclaw cron runs --id <jobId>` verify them

## Once scheduler path is fixed
Create the progress sweep first, then verify it, then add the health and end-of-day jobs.
