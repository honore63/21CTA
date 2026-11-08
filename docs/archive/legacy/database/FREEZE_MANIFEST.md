# Schema freeze manifest — 2026-11-08

**Purpose:** an immutable reference of the schema sources inspected during the
Phase 1 audit, so later changes can be diffed against a known state.

**Important:** these are **source-tree snapshots**, not live database dumps.
System A creates tables at runtime (`server.js` incremental migrations,
`init_new_features.sql`), so the live MySQL schema may contain objects absent
from the committed dump. A live schema capture remains an M0 task and requires
database credentials.

---

## 1. Generated MySQL schema-only dump

| Item | Value |
|---|---|
| File | `database/reference/mysql/lessonplan-mysql-schema-only.sql` |
| Source | `digital_lesson_plan-main/database/schema.sql` |
| Method | Removed every `INSERT INTO … ;` statement (line-based, multi-row aware); kept DDL, keys, constraints, views and comments |
| `CREATE TABLE` statements | 14 |
| `INSERT INTO` statements | 0 |
| Lines | 596 |
| Bytes | 18,642 |
| SHA-256 | `EB400BA37D5D189AA45633C49B0964940F398DCFE6FAA85C170EE3839AF69A63` |

Verification performed:

```powershell
(Select-String -Path .\lessonplan-mysql-schema-only.sql -Pattern '^CREATE TABLE').Count  # 14
(Select-String -Path .\lessonplan-mysql-schema-only.sql -Pattern 'INSERT INTO').Count    # 0
```

The **original** `digital_lesson_plan-main/database/schema.sql` (611.5 KB) still
contains sample users, bcrypt hashes, AI prompts and chat-like content. It was
**not modified**. Removing or replacing it is decision #8 in
`docs/SYSTEM_AUDIT.md` §12 and requires the owner's approval, because
`backend/scripts/import_db.js` and the README still reference it.

## 2. PostgreSQL source snapshot

All 23 SQL files from `RMS-MMS-main/backend/sql/` were copied verbatim to
`database/reference/postgres/`. This is a full source freeze, not a
schema-only extraction, because several files are incremental migrations and
contain data-affecting statements.

| File | SHA-256 |
|---|---|
| `admin_dashboard_count_upgrade.sql` | `5100791D5D91EF6BA5DE87F4A481F226A08B5E1DF615F1EE4FF9B877B7542B7F` |
| `analytics_marks_rls_fix.sql` | `2160C7F3BB5F97C06821A2843B729D38D2F9873B2196748200FBAB3415CAD894` |
| `assessment_no_approval.sql` | `BE8DC3F6E370D8C371F613495AD58DB616ADD70DD308ED2259A86598D036017B` |
| `assessment_normalization_upgrade.sql` | `537883D4F2ED4B98E6735BEAF986AE2485EEDFB7EDF86C2C806B68560F4C48B3` |
| `class_teacher_access.sql` | `4D74A0211B1DC97C568FE5E571BBAF4AEBA1C6025507A84B21E585FA8693FA84` |
| `clear-data.sql` | `D5E075CD8028A13314B16B15CB5ADBE479EEE764A4F2A9C2187C72B2A376697F` |
| `database.sql` | `E6D0D375307BA454897E8DCD612568DD4891DB5ED7E6BE78C50BA4F42D1FE447` |
| `deployment_pending.sql` | `DD6FD1D20BAA1B50852FEDCCD7B2AE31A512454DFA1751C22D7C07ECC1399385` |
| `digital_library.sql` | `78D2427D6AA5960BDBE01B1DC33F0B5075356F9FE810D3FE67E454FBB943FB66` |
| `examination_centre.sql` | `C59458AED3EB925C76A68E82528556B6E3962BB364E045988FDEB0028F1642FB2` |
| `examination_centre_grade_search.sql` | `DF42D7B1009418E82BC4789E40B6D5415FCD540FE77515BE9E0416378756C78D` |
| `learner_500_fix.sql` | `00327CC4183FF5F39B6CC55672CB0D9832609E6E6632B92FBDF133501097EACD` |
| `learner_select_performance_upgrade.sql` | `B6A4FF4141B4F4D52BCA2FDE79F85EC97C7B66EB3643668EEACAA62DEE917E95` |
| `optional_dos_fail_closed.sql` | `56CAD0806210932319BD5464844F31B3CAE57513E1E68D1B1C28484F6AAC4B4F` |
| `parent_student_marks_portal.sql` | `CC6DF26A24E95A842CE22E9BE6FA18684D3148B98ADC34907E100588C249FA67` |
| `primary_subjects_catalog_upgrade.sql` | `FE4EA21D05FAF089E29A0F689CBBFD01C115B889456FF447D81465C026298DE7` |
| `principal_parent_upgrade.sql` | `6AF34E5D8E25EF844E5E432A22AFB11DBA01268EA7E4D12FF3A540DF0ACB8FC8` |
| `secondary_subjects_catalog_upgrade.sql` | `35A1295717B4AAAD6D101F959F0FA145590EC3898D73A9C51E4ADA9FCF0F6B7D` |
| `teacher_assessment_delete.sql` | `9F86A9751D56CAD731BEA78527A57CB2589F86E5571B83CDBC28C3AC4AB2690A` |
| `teacher_registration_users_rls.sql` | `1DB9A14B2891E054850A7BC8636BB0CDFEDF52113BBF107935B7B6E1869A5D47` |
| `teacher_submitted_marks_edit.sql` | `B806E8F72302F38FB1B89D27A00ADE38A2F802F04BB054AE843EDF6CA8B135B1` |
| `user_id_fk_upgrade.sql` | `8D8A343FC023EEF566642BD1069A845689BD855A386A24DB6A659D011432FD1B` |
| `verify_dos_isolation.sql` | `FA26ADB497AD1DDE26A34B64894FCE7D53B78A0EEB3C00DE895E952AF0313192` |

Total: 434.1 KB.

### Hazardous files in the snapshot

- **`clear-data.sql`** deletes application data. It must never be run without a
  verified backup and explicit written approval.
- **`database.sql`** is idempotent by design but creates and alters many objects.
  Read it fully before running against production.
- **`deployment_pending.sql`** is an accumulated migration bundle. Apply it only
  after reviewing each statement and confirming which are already deployed.

The snapshot exists so these files cannot change underneath the migration plan.

## 3. What is not frozen yet

| Item | Reason | Needed for |
|---|---|---|
| Live MySQL schema | No credentials | Confirming runtime DDL drift |
| Live PostgreSQL schema | No credentials | Confirming deployed policies/functions |
| Supabase Auth configuration | No console access | Token issuer/audience/JWKS validation |
| Storage bucket policies | No console access | File privacy review |
| Row counts and data volumes | No database access | Migration sizing and validation |

Capture these in M0 once access is granted. Do not treat this manifest as proof
that production matches the source tree.
