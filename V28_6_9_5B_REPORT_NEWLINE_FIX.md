# V28.6.9.5b Report Newline Fix

## Purpose

This follow-up fixes the PR #35 Codex P2 feedback: the JSON report writer omitted the trailing newline, while the committed JSON report file already ended with a newline.

## Fix

`tools/verify-v28-6-9-5-turnstile-public-form-hardening.mjs` now writes:

```js
`${JSON.stringify(report, null, 2)}\n`
```

for `V28_6_9_5_TURNSTILE_PUBLIC_FORM_HARDENING_REPORT.json`.

## Expected Result

Running the V28.6.9.5 verifier repeatedly should not dirty the committed JSON report because of newline formatting.

## Safety

- No runtime public form logic changed.
- No Supabase migration.
- No production environment variable changes.
- No secrets added.
