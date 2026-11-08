# Phase 2 rollback snapshots

**Date:** 2026-11-08

| File | Retained? | Reason |
|---|---|---|
| `server.js` | **Yes** | Byte-identical pre-change copy; no secrets; hash in `ORIGINAL_SHA256SUMS.tsv` |
| `.env.example` | **No** | The pre-change copy contained live-looking AI keys |
| `import_db.js` | **No** | The pre-change copy contained a hardcoded database password |

`ORIGINAL_SHA256SUMS.tsv` records the hashes of all three original files as proof
of state. The two secret-bearing copies were deliberately **not** retained, so this
workspace does not re-commit the credentials it is trying to contain.

## Rollback policy

- `server.js` may be restored, but **should not be**. The old version could drop
  every non-view table. Keep the safe health-check version.
- `.env.example` and `import_db.js` must **never** be restored to a
  secret-bearing version. Their safer current versions are the intended state.

Verify the retained copy:

```powershell
(Get-FileHash -Algorithm SHA256 .\server.js).Hash
# A24EEE3A836175645D35BEA163DC426AF3915FF6E32CFC73023A49DE0AE5839C
```

See `../../docs/PHASE_2_REMEDIATION.md` for the full change record.
