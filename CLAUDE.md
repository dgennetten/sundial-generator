# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

A React SPA for designing and exporting printable sundials. Users configure a geographic location, dial geometry (gnomon, incline, declination), hour/date lines, and visual styles — then export to PNG, SVG, or PDF.

## Commands

```bash
npm run dev           # Vite dev server (port 5173)
npm run build         # TypeScript + Vite production build
npm run build:analyze # Build with bundle visualization
npm run lint          # ESLint
npm run test          # Vitest in watch mode
npm run test:run      # Single test run
npm run test:ui       # Vitest UI
npm run preview       # Preview production build
```

## Architecture

### Data Flow

```
User Input → App.tsx state → useMemo computations → SundialPreview.tsx → sundialMath.ts → SVG render → Export
```

### State Management

`App.tsx` is the monolithic state container (~1100 lines) with 20+ `useState` calls covering location, gnomon, page size, inclination, hour lines, line styles, text blocks, and UI flags. There is no external state library. Computed values are derived via `useMemo` (dial inclination, gnomon height, active hour line intervals, normalized declination lines, custom page size).

All state flows down to `SundialPreview.tsx` as individual props. SundialPreview calls `sundialMath.ts` to get shadow/line positions, then renders SVG directly.

### Key Files

| File | Role |
|------|------|
| `src/App.tsx` | All state, all setter callbacks, layout |
| `src/components/SundialPreview.tsx` | SVG rendering — receives all state as props |
| `src/utils/sundialMath.ts` | Core astronomical math: solar declination, azimuth/elevation, shadow projections, analemma points |
| `src/utils/dialSaveRestore.ts` | localStorage save/load for user dial configurations |
| `src/utils/exportUtils.ts` / `svgExportUtils.ts` / `simpleSvgExport.ts` | Export to PNG/SVG/PDF (html2canvas + jsPDF) |
| `src/utils/sundialPrintUtils.ts` | Optional Supabase analytics logging on export |
| `src/utils/geoipLocal.js` | Offline city→timezone lookup (~1000 cities, no API needed) |
| `src/utils/lineStyleUtils.ts` | Line stroke style management |
| `src/utils/hourlineUtils.ts` | Hour line interval configurations |
| `src/utils/declinationLineUtils.ts` | Declination (date) line configurations |
| `src/utils/logger.ts` | Centralized debug logging |
| `src/utils/dialTextBlockInterpreter.ts` | Template variable substitution for dial text blocks |

### Persistence

- **localStorage**: User-saved dial configurations via `dialSaveRestore.ts`
- **Supabase**: Optional analytics logging of exports (configured via `.env` — see `.env.example`)
- **sessionStorage**: Temporary flags (e.g., scroll position on reset)

### Dependencies Worth Knowing

- **Leaflet** (via `react-leaflet`): OpenStreetMap-based location picker
- **jsPDF + html2canvas**: PDF and PNG export
- **Supabase JS client**: Optional print logging

## Environment Variables

Copy `.env.example` to `.env.local` and fill in real values. `.env.local` is gitignored. Supabase vars are optional (analytics only). SFTP vars are needed for deployment.

**Windows encoding gotcha:** Windows editors (VS Code, Notepad) often save `.env.local` as UTF-16 LE. The deploy and upload scripts detect this automatically, so it does not need to be fixed manually.

## Deployment

```bash
npm run deploy-sftp              # Node SFTP upload script (build first)
npm run build-and-deploy         # PowerShell build + deploy script
node scripts/upload-email-config.js  # Upload email-config.php only (no full deploy needed)
node scripts/test-notification.js    # Smoke-test the export notification email
```

### Server-side files managed by deployment

`deploy-sftp.js` clears the remote directory on each deploy and re-uploads everything. The following files are **preserved** (never deleted):

| File | Purpose |
|------|---------|
| `email-config.php` | SMTP credentials for export notifications — gitignored, lives only on server |
| `config.php` | Another app sharing the directory |
| `notify.php` | Another app sharing the directory |
| `client-snippet-php.js` | Another app sharing the directory |
| `docs/` | Documentation directory |

`email-config.php` is also in the `phpFiles` upload list, so if you have it locally (copied from `email-config.example.php` with real credentials) it will be uploaded during deploy. It is gitignored and must never be committed.

### Export notification system

Exports and prints POST to `export-logger.php` on the production server, which logs to `./logs/export.log` and sends an email via PHPMailer/SMTP. Credentials come from `email-config.php` (loaded by the PHP script at runtime). If that file is missing, email silently fails — use `node scripts/test-notification.js` to diagnose.
