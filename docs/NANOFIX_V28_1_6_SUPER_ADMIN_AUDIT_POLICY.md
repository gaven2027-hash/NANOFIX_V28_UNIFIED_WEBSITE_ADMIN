# NANOFIX V28.1.6 Super Admin Audit Policy

This document records the V28.1.6 rule for owner-level administrative actions.

## Final rule

Super Admin has full-system owner authority, but every sensitive owner-level action must be recorded in Audit Logs.

Required audit fields:

- actor_id
- actor_role
- actor_email when available
- action
- object_type
- object_id when available
- reason_code
- reason_note when available
- before_data when changing a record
- after_data when changing a record
- created_at

## Required behaviour

1. No ordinary Admin, Engineer / Inspection, Operations, Finance or Customer role may perform owner-level actions.
2. Super Admin actions must not bypass Audit Logs.
3. Customer-visible records must respect privacy/public visibility, approval, desensitisation, archive and soft-delete rules.
4. Customer Portal remains independent and must not enter the Internal Admin App left primary menu.
5. Engineer / Inspection users use the Internal Admin App role group and must not receive a separate Engineer Portal / Register / Login.

## CI expectation

Predeployment validation should fail if code introduces a sensitive owner-level API or workflow without an Audit Logs write.
