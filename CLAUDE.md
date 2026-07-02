# CLAUDE.md

Guidance for working in this repository.

## What this is

**MCCOD** — Medical Certification of Cause of Death, a DHIS2 web application for
reviewing and certifying deaths using WHO ICD-11 coding. Supports four death-review
form types (MDR, PDR, CDR, MCCOD) with a config-driven dynamic form engine, offline
capture, and integration with Uganda's national NIN (National ID) API.

Stack: React 16 + TypeScript, MobX state, Ant Design UI, `@dhis2/app-runtime`,
Create React App rewired via `react-app-rewired` + `config-overrides.js`.

## Commands

```bash
yarn start   # dev server (proxies /api to DHIS2 via src/setupProxy.js)
yarn build   # regenerates public/manifest.webapp then builds
yarn test    # react-app-rewired test runner
```

- `NODE_OPTIONS=--openssl-legacy-provider` is required (legacy OpenSSL, set in scripts).
- This repo uses **yarn** (`yarn.lock`). Do not add `package-lock.json`.
- `config-overrides.js` rewires CRA to load Ant Design via `babel-plugin-import` + Less.

## Architecture

- `src/index.tsx` — entry; wraps app in `@dhis2/app-runtime` Provider + registers service worker.
- `src/App.tsx` — root; routes between Home, DynamicForm, and legacy flows.
- `src/Store.tsx` — main MobX store (~1800 lines): user, org units, programs, languages,
  option sets, and legacy MCCOD form state.
- `src/Context.tsx` — `StoreContext` provider + `useStore` hook.
- `src/stores/api.ts` — NIN API credential/token store (DHIS2 datastore namespace).

### Dynamic forms (`src/forms/`)
Config-driven engine for MDR/PDR/CDR/MCCOD, decoupled from the legacy `Form.tsx`.
- `registry.ts` — form definitions + program UIDs.
- `layouts.json` — declarative sections → groups → fields with data-element UIDs.
- `DynamicFormStore.ts` — loads form metadata, event CRUD, computes WHO DORIS cause.
- `skipLogic.ts` — field visibility/disabled/hint rules from runtime values.
- `types.ts` — `FormField`, `FormGroup`, `FormSection`, `FormDefinition`.

### Offline & PWA
- `src/services/offlineDataService.ts` — IndexedDB stores: `formData`, `syncQueue`, `organisationUnits`.
- `src/services/syncService.ts` — batch-pushes queued events to DHIS2, retries up to 3×.
- `src/hooks/useFormPersistence.ts` — auto-saves form data to IndexedDB every 30s.
- `src/serviceWorker.ts` — registered dev+prod; prompts on app update.

### Integrations & proxy
- `src/utils/ninApi.ts` — National ID lookups (`getPerson`, `getPlaceOfResidence`), retries on 419/503/504.
- `src/setupProxy.js` — dev proxy; forwards `/api` to `DHIS2_PROXY_TARGET`, injects Authorization from env.
- `proxy-server.js` — standalone proxy (port 5002) for non-React contexts.

### Legacy
- `src/components/Form.tsx` (large) — original monolithic MCCOD certification form. The
  DynamicForm system is the newer path; `Form.tsx` remains in use for MCCOD certification.

## Environment

Config lives in `.env`, `.env.development`, `.env.production` (values are secrets — do not print).
Key vars: `REACT_APP_DHIS2_BASE_URL`, `REACT_APP_DHIS2_AUTHORIZATION`, `DHIS2_PROXY_TARGET`,
`REACT_APP_VERSION`, `SKIP_PREFLIGHT_CHECK`. Dev auth is injected server-side by `setupProxy.js`;
prod relies on the DHIS2 session cookie.

## Notes

- `scratch/` and `mpdsr/` hold exploratory scripts and reference HTML — not part of the build.
