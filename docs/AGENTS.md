# Website Guidance

## Scope

Despite the folder name, this folder contains the public Chuchotage website source. Keep treating `docs/` as the current website root unless the project is explicitly renamed to `website/` or moved elsewhere.

The static site entry points are `index.html`, `privacy/index.html`, `blog/index.html`, and `blog/why-chuchotage/index.html`, with shared styling in `styles.css` and website localization/runtime behavior in `site-i18n.js`. This folder also contains shared product docs and project provenance notes.

Keep the site aligned with the apps' current product truth and `product-design-guidelines.md`: personal-use, device-local-first realtime translation, no ads, no analytics SDKs, no hosted Chuchotage audio server, local credential storage, direct OpenAI audio exchange during active translation sessions, and a clearly described sponsored-trial token endpoint when that mode is available.

## Canonical URLs

- Public website: `https://www.chuchotage.ai/`
- Public iOS App Store listing: `https://apps.apple.com/it/app/chuchotage/id6770434335`
- Public Android Google Play listing: `https://play.google.com/store/apps/details?id=com.andreabertoncini.chuchotage`
- Blog index: `https://www.chuchotage.ai/blog/`
- Name story: `https://www.chuchotage.ai/blog/why-chuchotage/`
- Privacy policy: `https://www.chuchotage.ai/privacy/`
- Sitemap: `https://www.chuchotage.ai/sitemap.xml`
- Robots: `https://www.chuchotage.ai/robots.txt`

Keep app privacy links pointing to `https://www.chuchotage.ai/privacy/` unless the website/domain changes.

## Content And Brand

Use the Chuchotage product name consistently. Keep visual and copy changes aligned with `product-design-guidelines.md`.

Do not make privacy, credential, backend, analytics, ads, availability, or data-flow claims that conflict with shipped app behavior.

## Static Site And Localization

The public site is a static site in this folder. Keep the first screen as the actual Chuchotage product page, not a marketing-only landing page, and avoid adding browser app surfaces unless the task explicitly asks for them.

Website localization lives in `site-i18n.js`. When changing visible website copy, metadata, privacy text, blog/story text, navigation, footer labels, or supported-language wording, update the localized copy there as well as any static fallback HTML that appears before JavaScript runs.

The website UI language selector is a site chrome control, not the app's translated-audio language picker. Keep it in the sticky top bar only unless the user explicitly asks for more placements, and keep it visually obvious with the language/globe affordance.

The website UI is currently localized into:

```text
en, es, it, fr, de, pt
```

Keep the public product copy that describes app output languages aligned with the shared supported output-language lists in the native apps. Keep the website UI language list aligned with the localized copy available in `site-i18n.js` and with the support service's `GET /api/geo-language` country-to-language suggestions. If `site-i18n.js` or `styles.css` changes, update the cache-busting query string on every page that includes it: home, privacy, blog index, and the name-story page.

The site may ask the first-party Chuchotage support service for a coarse `/api/geo-language` suggestion when the visitor has not manually selected a website language. Manual language choices are stored in browser local storage and override automatic detection. Do not describe this as analytics, tracking, account state, or audio processing.

## Support Service Boundary

The small Node service behind website/product support APIs is the Chuchotage support service. Do not reintroduce beta-signup naming in docs, code references, tests, or deployment notes.

The old `/api/beta` signup endpoint has been removed and should remain unavailable. Current public/support API references should use only the live support-service endpoints described in `server/AGENTS.md`, especially `/api/geo-language` and `/api/trial/realtime-translation-client-secret`.

## Operational Notes

Private hosting, DNS, Search Console, rollout, service-account, and deployment details belong in ignored `AGENTS.local.md`, not in this folder.

Do not commit generated credential files, DNS provider credentials, deployment secrets, temporary review API keys, or local `.env` files.
