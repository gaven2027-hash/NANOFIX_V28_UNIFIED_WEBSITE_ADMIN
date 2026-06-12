# NANOFIX V28.9 Auto Global Repair Local Command

Run this command set exactly from Windows PowerShell:

```powershell
cd "C:\Users\Amelindo\Documents\NANOFIX_V28_UNIFIED_WEBSITE_ADMIN"
pwd
git status
git fetch origin
git checkout -B v28-9-auto-global-repair origin/v28-9-auto-global-repair
git status

node tools/v28-9-auto-global-repair.mjs
node tools/verify-v28-9-auto-global-repair.mjs
git status
```

Expected result before merge:

- auto scanner: `ok: true`
- verifier: `ok: true`
- failures: `[]`
- git working tree: clean
