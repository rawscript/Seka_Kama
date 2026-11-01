# Implementation Plan: Phase 1 Production Audit and Organization

## Confirmed Scope

This is an AUDIT/ORGANIZATION phase only — NO code changes, NO architectural changes. Preserve all file content (only move locations). Document findings, do not fix them.

## Confirmed File Inventory

### Root-level documentation files that exist and will be moved to docs/:
- ✅ `AUDIT.md` → `docs/AUDIT.md`
- ✅ `MODEL_CARD.md` → `docs/MODEL_CARD.md`
- ✅ `OPEN_ITEMS.md` → `docs/OPEN_ITEMS.md`
- ✅ `SECURITY.md` → `docs/SECURITY.md`
- ✅ `CODE_OF_CONDUCT.md` → `docs/CODE_OF_CONDUCT.md`
- ✅ `CHANGES.md` → `docs/CHANGELOG.md` (rename to CHANGELOG.md)

### Files that remain in root:
- `README.md` (per user guideline)
- `LICENSE`
- `.gitignore`
- `.github/` (workflow files)
- `backend/` (code directory)
- `web-app/` (code directory)

### Other root-level files (not moved):
- `CITATION.cff` (metadata, not user documentation)
- `baseline.json`, `package-lock.json` (config/lock files)
- `deploy.sh`, `Makefile`, `nginx.conf` (deployment scripts)
- `docker-compose*.yml`, `Dockerfile*` (infrastructure)

### Existing docs/ directory contents (preserved):
- `API_DOCUMENTATION.md`
- `CONTACT_FORM_SETUP.md`
- `data_dictionary.md`
- `Seka Kama - Proposal.pdf`
- `Seka_Kama_System_Research_Paper.docx`
- `source_register.md`
- `system_architecture_diagrams.md`
- `USER_GUIDE.md`
- `workflow.md`

## Confirmed Frontend Structure

**Path:** `web-app/seka_kama/`

**Build system:** Next.js 16 with Tailwind CSS v4, TypeScript

**Build command:** `npm run build` (next build --webpack)

**Test command:** `npm run typecheck` (tsc --noEmit) and `npm run lint` (eslint .)

**Key directories:**
- `app/` - Next.js 16 app router pages (about, contact, dashboard, data-standards, demo, documentation, geospatial, intelligence, login, methodology, privacy, register, settings)
- `components/` - React components (TSX files including AnalystPanel, DashboardTabs, DraggablePanel, EcosystemIndicatorsPanel, ErrorBoundary, FeedbackButton, FeedbackDashboard, Footer, GlobalErrorBoundary, KeplerMap, and many others)
- `app/globals.css` - Theme definitions with CSS custom properties
- `contexts/` - React contexts
- `hooks/` - React hooks
- `lib/` - Utility libraries
- `services/` - Frontend services
- `types/` - TypeScript type definitions

**Theme colors defined in globals.css:**
- `--color-brand-gold: #775a19`
- `--color-brand-dark-gold: #4e3700`
- `--color-brand-bg: #f9f9f9`
- `--color-brand-charcoal: #1a1c1c`
- `--color-brand-muted: #4e4639`

## Confirmed Backend API Structure

**Path:** `backend/api/`

**Route files:**
- `routes.py` - Main API routes (baseline, scenario, health)
- `auth_routes.py` - Authentication routes (register, login, logout, profile)
- `key_routes.py` - API key management routes
- `main.py` - FastAPI application entry point
- `models.py` - Request/response models (ScenarioRequest, ScenarioResponse, BaselineResponse, ExplanationRequest, ExplanationResponse)

**Response schema module:** `backend/core/response_schemas.py` exists with standardized ErrorResponse, ErrorDetail, ErrorLevel classes

**Current state:**
- `routes.py` uses response models from `models.py` (BaselineResponse, ScenarioResponse)
- `auth_routes.py` defines inline models (ProfileUpdate, PasswordChange) and uses models from `core.auth`
- `key_routes.py` defines inline models (ApiKeyCreate, ApiKeyResponse, ApiKeyReveal)
- Error handling is inconsistent - some routes use HTTPException, some use response_schemas
- Input validation exists via Pydantic models but coverage varies
- Many routes lack explicit response_model declarations

## Mock/Placeholder Behavior Search Plan

**Directories to search:** All directories under worktree root

**Directories to exclude:**
- `.git`
- `node_modules`
- `.next`
- `.venv`
- `__pycache__`
- `.worktrees`
- `dist`
- `build`

**Search patterns:**
1. Comments containing: `TODO`, `FIXME`, `HACK`, `XXX`, `mock`, `placeholder`, `temp`
2. Pass-through/stub implementations
3. Disabled features with TODO notes
4. Known issues from grep search:
   - Scenario simulation intentionally disabled (routes.py line 420)
   - Model provenance TODOs in documentation
   - Test mocking examples in design documents
   - Template files with "temp" in names

## Execution Plan

### Task 1: Directory Organization

- [ ] 1. Move root documentation files to docs/ directory and update cross-references
      Move AUDIT.md, MODEL_CARD.md, OPEN_ITEMS.md, SECURITY.md, CODE_OF_CONDUCT.md to docs/.
      Rename CHANGES.md to CHANGELOG.md during move.
      Update internal references in moved files to reflect new paths.
      Files: AUDIT.md → docs/AUDIT.md, MODEL_CARD.md → docs/MODEL_CARD.md, OPEN_ITEMS.md → docs/OPEN_ITEMS.md, SECURITY.md → docs/SECURITY.md, CODE_OF_CONDUCT.md → docs/CODE_OF_CONDUCT.md, CHANGES.md → docs/CHANGELOG.md
      Verify: Run `git status` and confirm exactly 6 files moved (5 + 1 renamed), no content changes

### Task 2: Frontend Visual Audit

- [ ] 2. Scan frontend for hardcoded colors not from theme
      Search all TSX files in web-app/seka_kama/app/**/*.tsx and web-app/seka_kama/components/**/*.tsx for hardcoded color values (hex codes, rgb(), rgba(), hsl()) that are not defined in globals.css theme variables.
      Files: web-app/seka_kama/app/**/*.tsx, web-app/seka_kama/components/**/*.tsx
      Verify: Produce docs/frontend_visual_audit.md with table of findings

- [ ] 3. Scan frontend for emoji usage
      Search all TSX files for emoji characters (Unicode emoji ranges U+1F600–U+1F64F, U+1F300–U+1F5FF, U+1F680–U+1F6FF, U+1F900–U+1F9FF, U+2600–U+26FF, U+2700–U+27BF).
      Files: web-app/seka_kama/app/**/*.tsx, web-app/seka_kama/components/**/*.tsx
      Verify: Add findings to docs/frontend_visual_audit.md

- [ ] 4. Scan frontend for centering via margins instead of flexbox/grid
      Search TSX files for patterns like `margin: 0 auto`, `marginLeft: 'auto'`, `marginRight: 'auto'`, `mx-auto` (Tailwind) used for horizontal centering instead of flex/grid utilities.
      Files: web-app/seka_kama/app/**/*.tsx, web-app/seka_kama/components/**/*.tsx
      Verify: Add findings to docs/frontend_visual_audit.md

- [ ] 5. Identify inconsistent spacing and sizing patterns
      Document spacing/sizing inconsistencies: hardcoded pixel values instead of Tailwind spacing scale, inconsistent button/input heights, mixed spacing units (px, rem, em).
      Files: web-app/seka_kama/app/**/*.tsx, web-app/seka_kama/components/**/*.tsx, web-app/seka_kama/app/globals.css
      Verify: Complete docs/frontend_visual_audit.md with recommendations table

### Task 3: API Route Consistency Audit

- [ ] 6. Create endpoint inventory for all API routes
      Document all endpoints with: HTTP method, path, request model, response model, auth required (yes/no), error handling approach.
      Files: backend/api/routes.py, backend/api/auth_routes.py, backend/api/key_routes.py
      Verify: Produce docs/api_consistency_audit.md with endpoint inventory table

- [ ] 7. Identify routes missing response_model declarations
      List endpoints lacking explicit response_model parameter in decorator, making response schema unclear.
      Files: backend/api/routes.py, backend/api/auth_routes.py, backend/api/key_routes.py
      Verify: Add findings to docs/api_consistency_audit.md

- [ ] 8. Identify inconsistent error handling patterns
      Document mix of HTTPException usage vs response_schemas.ErrorResponse, inconsistent status codes, missing error messages.
      Files: backend/api/routes.py, backend/api/auth_routes.py, backend/api/key_routes.py, backend/core/response_schemas.py
      Verify: Add findings to docs/api_consistency_audit.md

- [ ] 9. Identify routes lacking input validation
      List endpoints missing Pydantic model validation, query parameter validation, or request body validation.
      Files: backend/api/routes.py, backend/api/auth_routes.py, backend/api/key_routes.py
      Verify: Add findings to docs/api_consistency_audit.md

- [ ] 10. Document duplicate/unclear endpoint patterns
      Identify duplicate route patterns (e.g., /endpoint and /endpoint/), unclear naming, inconsistent path structures.
      Files: backend/api/routes.py, backend/api/auth_routes.py, backend/api/key_routes.py
      Verify: Complete docs/api_consistency_audit.md with standardization recommendations

### Task 4: Mock Behavior Identification

- [ ] 11. Search codebase for TODO/FIXME/HACK/XXX comments
      Grep entire codebase (excluding .git, node_modules, .venv, .worktrees, __pycache__, .next, dist, build) for TODO|FIXME|HACK|XXX comments.
      Files: All source files (backend/**/*.py, web-app/**/*.tsx, web-app/**/*.ts)
      Verify: Create docs/mock_behavior_inventory.md with findings table (file:line, context, type)

- [ ] 12. Search codebase for mock/placeholder/temp indicators
      Grep for keywords: mock, placeholder, temp (case-insensitive) in code comments and variable names.
      Files: All source files (backend/**/*.py, web-app/**/*.tsx, web-app/**/*.ts)
      Verify: Add findings to docs/mock_behavior_inventory.md

- [ ] 13. Identify intentionally disabled features
      Document known disabled features: scenario simulation (routes.py HTTP 503), feature flags set to false, commented-out code blocks.
      Files: backend/api/routes.py, backend/config/scenario_features.yaml, backend/services/prediction_service.py
      Verify: Add findings to docs/mock_behavior_inventory.md

- [ ] 14. Categorize mock behaviors by complexity and priority
      Assign each finding: estimated complexity (low/medium/high) and priority (blocking/important/nice-to-have).
      Rationale: Low = single function fix, Medium = multi-file change, High = requires external data or major refactor.
      Priority: Blocking = prevents production use, Important = affects UX/reliability, Nice-to-have = polish.
      Files: docs/mock_behavior_inventory.md
      Verify: Complete docs/mock_behavior_inventory.md with categorized table

### Task 5: Update Documentation Cross-References

- [ ] 15. Update README.md to reference new doc locations
      Update all references to moved documentation files: AUDIT.md → docs/AUDIT.md, MODEL_CARD.md → docs/MODEL_CARD.md, OPEN_ITEMS.md → docs/OPEN_ITEMS.md, CHANGES.md → docs/CHANGELOG.md.
      Files: README.md
      Verify: Run `grep -E "(AUDIT|MODEL_CARD|OPEN_ITEMS|SECURITY|CODE_OF_CONDUCT|CHANGES).md" README.md` and confirm all paths include docs/ prefix

- [ ] 16. Fix broken internal links in moved documentation files
      Update cross-references within AUDIT.md, MODEL_CARD.md, OPEN_ITEMS.md to reflect new paths from docs/ directory.
      Files: docs/AUDIT.md, docs/MODEL_CARD.md, docs/OPEN_ITEMS.md, docs/CHANGELOG.md, docs/SECURITY.md, docs/CODE_OF_CONDUCT.md
      Verify: Run `grep -E "\[.*\]\(\.\./" docs/*.md` and confirm all relative links are correct

- [ ] 17. Update .github/ workflows if they reference moved files
      Check workflow files for references to moved documentation and update paths.
      Files: .github/workflows/*.yml (if any reference AUDIT.md, MODEL_CARD.md, etc.)
      Verify: Run `grep -rE "(AUDIT|MODEL_CARD|OPEN_ITEMS|SECURITY|CODE_OF_CONDUCT|CHANGES).md" .github/` and confirm all paths include docs/ or no matches found

- [ ] 18. Create single commit with all changes
      Stage all moved files, new audit reports, and updated cross-references.
      Commit message: 'chore: organize documentation and create production audit reports'
      Files: All modified and moved files
      Verify: Run `git log -1 --name-status` and confirm single commit with expected file moves and new audit reports

## Deliverables Summary

1. **Reorganized docs/ directory** with 6 moved files (AUDIT.md, MODEL_CARD.md, OPEN_ITEMS.md, SECURITY.md, CODE_OF_CONDUCT.md, CHANGELOG.md)
2. **docs/frontend_visual_audit.md** - Table of hardcoded colors, emoji usage, margin-based centering, spacing/sizing inconsistencies with recommendations
3. **docs/api_consistency_audit.md** - Endpoint inventory, missing schemas, error handling gaps, validation gaps, standardization recommendations
4. **docs/mock_behavior_inventory.md** - Categorized list of TODOs/FIXMEs/HACKs, mock/placeholder code, disabled features with complexity/priority ratings
5. **Updated README.md** with correct doc paths
6. **Updated cross-references** in moved docs and .github/ workflows
7. **One commit** with message 'chore: organize documentation and create production audit reports'

## Verification Commands

- **Build command:** `cd web-app/seka_kama && npm run build` (Next.js build)
- **Typecheck:** `cd web-app/seka_kama && npm run typecheck` (TypeScript validation)
- **Lint:** `cd web-app/seka_kama && npm run lint` (ESLint)
- **Backend validation:** `cd backend && python -m py_compile api/routes.py api/auth_routes.py api/key_routes.py`
- **Git status:** `git status` (confirm only expected changes)
- **Link check:** `grep -rE "(\[.*\]\(|href=)" docs/ README.md` (verify all links resolve)

## Constraints

- ❌ NO code changes to implementation
- ❌ NO architectural changes
- ❌ NO fixing of identified issues
- ✅ ONLY move files to docs/
- ✅ ONLY update cross-references to reflect new paths
- ✅ ONLY document findings in audit reports
- ✅ Preserve all file content (move locations only)
- ✅ All audit reports use markdown with tables
- ✅ One commit at end: 'chore: organize documentation and create production audit reports'
