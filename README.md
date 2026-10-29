# MyMiXO6 — Team Lobby Platform

A Persian RTL gaming-lobby app built with React, Vite and Supabase.

## Included

- A clean, compact **M monogram + MyMiXO6 wordmark**. The earlier M favicon is restored; the logo no longer depends on generated `.webp` files or a complex animated SVG wordmark.
- Subtle 2D motion on the mark and wordmark: pointer tracking, hover glow, and press feedback. The Persian hero title animates line-by-line and responds to mouse movement/press in both themes. Reduced-motion preferences are respected.
- `NEON` and `CLASSIC` appearance choices saved in the current browser. Navigation icons are inline SVGs, not icon-font glyphs, so they do not degrade to square placeholders.
- The original eight glyph avatars (Nova, Vex, Orbit, Pixel, Ghost, Ember, Luna, Drift) are restored. The generated character portraits are removed from the deployed app.
- Lobby panels, membership/profile list, private-to-members chat, live updates, owner close control, and server-side ten-minute auto-close after a lobby first reaches capacity.
- SEO title/description, canonical URL, Open Graph metadata, `robots.txt`, `sitemap.xml`, favicon and web manifest.

## Brand asset note

`public/mymixo6-mark.svg` is the original M favicon. The main app builds its logo lockup from that visual language and a readable wordmark. The uploaded calligraphic SVG is preserved only as a reference at `design-assets/mymixo6-logo-uploaded-original.svg`; it is not rendered as the app logo. The two theme previews use the same inline logo component as the real site.

## Local run

Requirements: Node.js 22+.

```sh
npm install
npm run dev
```

Create `.env` from `.env.example` for local development. Use only the public Supabase publishable key in client code; never put a service-role/secret key in the frontend.

## Build for GitHub Pages

```sh
npm install --no-audit --no-fund
npm run build -- --base=/MyMiXO6/
```

GitHub Actions supplies the build-time `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` variables. After committing the files to `main`, check the build/deploy jobs before testing the live site.

## Supabase note

The accompanying `supabase/migrations/` directory includes the database migration history for this project. The linked database already has chat/member RLS and full-capacity timer changes applied; do not manually re-run those SQL files on the existing production database. The automatic closing job runs on the server every 30 seconds, so the final status transition may appear up to roughly 30 seconds after the UI countdown reaches zero.


## Brand assets

- `public/mymixo6-logo.png` is the supplied Neon Green M6 Emblem (cropped only to remove transparent canvas; visible pixels are preserved).
- `public/mymixo6-favicon.png`, `public/mymixo6-mark.png`, the Web App Manifest, and Open Graph preview all use that same supplied mark.
- `public/avatars/*.webp` restores the eight character portrait avatars from the prior release.
- Brand name text is animated separately from the logo image, with hover, pointer-follow, press feedback, and reduced-motion support.
