# Diary AI legal and deletion site

This directory is the source for the public `camiloparets2/diary-ai-legal` GitHub Pages repository. It publishes the privacy, support, subscription, and authenticated account-deletion pages required for the closed beta.

Production builds intentionally fail until all public operator values are supplied and `VITE_LEGAL_REVIEWED=true` is set after English and Spanish legal review. The deletion flow uses Appwrite Email OTP, creates a 15-minute JWT, and calls the existing authenticated `DELETE /account` Function route. It never contains provider or Appwrite API secrets.

The Pages deployment job is skipped until the repository variable `LEGAL_REVIEWED` is exactly `true`. This keeps `main` green without publishing placeholders; after review, enable Pages with GitHub Actions as its source and dispatch the publish workflow.

Before enabling Pages:

1. Register `camiloparets2.github.io` as a Web platform in both Appwrite targets.
2. Set every value from `.env.example` as GitHub repository variables.
3. Obtain professional review of both languages, then set `LEGAL_REVIEWED=true`.
4. Verify OTP, invalid-code, expired-code, accepted deletion, and signed-out behavior against production.
