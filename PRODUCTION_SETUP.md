# Ecard Production Setup

## 1. Supabase
- Create a Supabase project.
- Run `supabase/schema.sql` in SQL editor.
- Add auth providers and email templates.
- Add these env vars to Vercel/Netlify:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## 2. Security
- Enable email confirmation and password reset in Supabase Auth.
- Add bot protection and rate limiting at edge (Cloudflare/Vercel WAF).
- Use RLS policies from schema.

## 3. Payments
- Stripe or Iyzico webhook service should write subscription state to `profiles.pro_enabled`.
- Add plans: Starter, Pro, Business.

## 4. Custom Domain
- Use `domains.ecard.tr` as CNAME target.
- Verify DNS by checking CNAME/TXT records.
- Issue SSL via hosting provider and map host header to profile.

## 5. Analytics & Pixel
- Track `profile_view`, `link_click`, `sponsor_click`, `conversion` events to `analytics_events`.
- Inject Meta Pixel and GA4 only when `pro_enabled=true` and IDs are present.

## 6. Media
- Use Supabase Storage buckets:
  - `avatars`
  - `media-kits`
  - `sponsor-banners`

## 7. Ops
- Sentry for runtime errors.
- Uptime monitor for root, /studio, /admin.
- Weekly cron to email analytics summary.
