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
| `src/utils/sundialPrintUtils.ts` | MySQL analytics logging on export (via sundial-prints-api.php) |
| `src/utils/geoipLocal.js` | Offline city→timezone lookup (~1000 cities, no API needed) |
| `src/utils/lineStyleUtils.ts` | Line stroke style management |
| `src/utils/hourlineUtils.ts` | Hour line interval configurations |
| `src/utils/declinationLineUtils.ts` | Declination (date) line configurations |
| `src/utils/logger.ts` | Centralized debug logging |
| `src/utils/dialTextBlockInterpreter.ts` | Template variable substitution for dial text blocks |
| `src/components/gallery/` | Photo gallery — fullscreen grid + lightbox, OTP sign-in, upload (see below) |
| `src/services/galleryApi.ts` / `galleryAuth.ts` | Gallery fetch/upload and OTP session handling |

### Persistence

- **localStorage**: User-saved dial configurations via `dialSaveRestore.ts`
- **MySQL**: Analytics logging of exports via `sundial-prints-api.php` (credentials in `db-config.php`)
- **sessionStorage**: Temporary flags (e.g., scroll position on reset)

### Dependencies Worth Knowing

- **Leaflet** (via `react-leaflet`): OpenStreetMap-based location picker
- **jsPDF + html2canvas**: PDF and PNG export

## Environment Variables

Copy `.env.example` to `.env.local` and fill in real values. `.env.local` is gitignored. SFTP vars are needed for deployment. MySQL credentials go in `db-config.php` (gitignored).

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
| `db-config.php` | MySQL credentials — gitignored, lives only on server |
| `gallery-uploads/` | User-submitted gallery photos — **never in git; the server copy is the only copy** |
| `config.php` | Another app sharing the directory |
| `notify.php` | Another app sharing the directory |
| `client-snippet-php.js` | Another app sharing the directory |
| `docs/` | Documentation directory |

`email-config.php` is also in the `phpFiles` upload list, so if you have it locally (copied from `email-config.example.php` with real credentials) it will be uploaded during deploy. It is gitignored and must never be committed.

### Photo gallery

Opened from the **Photos** button in the How-to-Build popup. A flat grid of user-submitted
sundial photos with a lightbox (`yet-another-react-lightbox`, same as the `portfolio` repo).

Anyone can upload after a one-time-code email sign-in — there is no allowlist, so
`gallery-request-otp.php` is throttled (3 codes per email per 10 min, 10 per IP per hour) to
keep it from being used as a mail relay.

Uploads land as `pending` and are invisible to everyone except their uploader. Each upload
emails `GALLERY_MODERATOR_EMAIL` (default `douglas@gennetten.com`) with the photo attached and
Approve / Reject links. Those links open a confirmation page rather than acting on load —
mail scanners fetch every URL in an email, which would otherwise auto-approve submissions.
Rejecting deletes the file from disk.

| File | Role |
|------|------|
| `gallery-schema.sql` | One-time DDL — run against the `sundials` DB before first use |
| `gallery-config.php` | DB/CORS/mail helpers and gallery constants |
| `gallery-auth.php` | Bearer-token middleware (`gallery_require_user()`) |
| `gallery-request-otp.php` / `gallery-verify-otp.php` / `gallery-session.php` | OTP sign-in |
| `gallery-photos.php` | Public list of approved photos (+ caller's own pending); adds `can_delete` per photo when authenticated |
| `gallery-upload.php` | Multipart upload → `gallery-uploads/`, downscales + strips EXIF via GD |
| `gallery-moderate.php` | Approve/reject confirmation page for the email links |
| `gallery-delete.php` | Delete a photo + its file; allowed for the owner or the moderator |

**Dreamhost gotcha — the Authorization header:** Dreamhost runs PHP as FastCGI (`cgi-fcgi`),
which strips the `Authorization` header before PHP sees it. The gallery's Bearer-token
endpoints depend on it, so `.htaccess` re-injects it via a mod_rewrite `E=HTTP_AUTHORIZATION`
rule. `.htaccess` is gitignored but is uploaded by `deploy-sftp.js` (in `phpFiles`) and
preserved on the server. Without it, every authenticated gallery call returns 401.

Images are stored in `gallery-uploads/` on the server with random filenames. That directory is
preserved by `deploy-sftp.js` and is **not** in git — there is no backup other than the server.

### Export notification system

Exports and prints POST to `export-logger.php` on the production server, which logs to `./logs/export.log` and sends an email via PHPMailer/SMTP. Credentials come from `email-config.php` (loaded by the PHP script at runtime). If that file is missing, email silently fails — use `node scripts/test-notification.js` to diagnose.
