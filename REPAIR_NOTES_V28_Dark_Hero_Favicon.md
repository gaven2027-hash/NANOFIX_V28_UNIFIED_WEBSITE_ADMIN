# NANOFIX V28 Repair Notes - Dark Hero Overlay + Favicon Logo

## Fixed items

1. Service hero/banner image mask
   - Added a final CSS override in `lib/legacy/inline.css`.
   - All `.service-hero-visual` banners now use a dark black gradient mask matching the supplied reference style.
   - The override targets banners with both `.service-hero-visual` and `.premium-hero-visual`, so the previous lighter premium overlay can no longer override the dark mask.

2. Browser address bar logo / favicon
   - Generated NANOFIX favicon and browser icon assets from the uploaded NANOFIX logo:
     - `public/favicon.ico`
     - `public/icon.png`
     - `public/apple-touch-icon.png`
   - Added favicon metadata and `<link rel="icon">` entries in `app/layout.tsx`.
   - Updated `tools/build-preview-package.mjs` so preview HTML also shows the favicon and carries the icon files.

## Checked

- Preview package generation completed successfully with `node tools/build-preview-package.mjs`.
- Next.js production compilation reached `Compiled successfully`; the local sandbox timed out during the Next.js `Collecting page data` phase, so please run `npm ci && npm run build` once more on Vercel/GitHub or local machine after upload.
