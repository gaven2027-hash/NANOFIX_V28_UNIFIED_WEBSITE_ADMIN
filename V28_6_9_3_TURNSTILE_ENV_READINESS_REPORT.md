# V28.6.9.3 Turnstile + Env Readiness Lift Report

Generated: 2026-06-10T04:05:00.000Z

OK: true

## Summary

- P0: 0
- P1: 0
- P2: 0

## Expected production effect

- With current production core envs and no external admin webhook enabled, `/api/system/health` readiness_score should lift from 83 to 94.
- If both Turnstile site key and secret are later configured, the score can reach 96.
- `/api/ready` remains `ok:true` because optional hardening variables are not production blockers.
- Public repair requests continue to persist to Supabase and `integration_outbox` even when the optional forwarding URL is not configured.

## Findings

- No static findings.
