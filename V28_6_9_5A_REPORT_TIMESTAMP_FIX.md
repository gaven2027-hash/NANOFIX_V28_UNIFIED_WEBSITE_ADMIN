# V28.6.9.5a Report Timestamp Stability Fix

## Purpose

This follow-up fixes the P2 review feedback from PR #34: the V28.6.9.5 verifier rewrote committed report files on every run because `generated_at` was recomputed every time.

## Fix

`tools/verify-v28-6-9-5-turnstile-public-form-hardening.mjs` now resolves `generated_at` in this order:

1. `NANOFIX_REPORT_GENERATED_AT` environment override when explicitly supplied.
2. Existing `generated_at` from `V28_6_9_5_TURNSTILE_PUBLIC_FORM_HARDENING_REPORT.json`.
3. Stable default `2026-06-11T02:10:00.000Z` when no report exists.

## Expected Result

Running the verifier repeatedly against unchanged source should not dirty the working tree only because of a timestamp change.

## Safety

- No runtime public form logic changed.
- No Supabase migration.
- No production environment variable changes.
- No secrets added.
