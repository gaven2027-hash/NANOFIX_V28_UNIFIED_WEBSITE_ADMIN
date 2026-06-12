# DO NOT MERGE UNTIL VALIDATED

Branch: `v28-9-auto-global-repair`

This branch must remain draft / unmerged until local verifier and Vercel preview pass.

Required:

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
