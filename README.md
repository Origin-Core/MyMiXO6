# MyMiXO6

A Persian, right-to-left gaming lobby site built with React, Vite, and Supabase.

## Included features

- Email/password sign-up with email confirmation and persistent browser sessions.
- Public player profiles with preset avatars; email addresses are not stored in the public profile table or shown on the site.
- Searchable public lobbies, join/create flows, invite links, and server-side capacity enforcement.
- Config and Store sections marked as coming soon.
- Supabase migrations and Render static-site configuration.

## Local development

Node.js 22 or newer is recommended.

```sh
npm install
npm run dev
```

The supplied `.env` contains only the Supabase project URL and a **publishable client key**. Do not use a Supabase `service_role` key or secret key in the browser. The `.env` file is ignored by Git; Render receives the same publishable values through `render.yaml`.

## Database

The migrations in `supabase/migrations/` are in order and match the MyMiXO6 Supabase project. They create the profile/lobby tables, RLS policies, signup profile trigger, lobby capacity checks, safe member counts, and invite URL validation. Do not paste the schema into a different production database without reviewing the target first.

## Deployment

`render.yaml` configures a static site build, SPA fallback route, basic security headers, and the public Supabase client values. Once this repository is connected to GitHub and deployed through Render, set the resulting site's exact HTTPS URL as the Supabase Auth **Site URL** and add that origin to the Auth **Redirect URLs** allow-list. Email confirmation links use the current site origin, so this step is required before end-to-end registration testing on the deployed domain.

For public sign-ups, verify that email delivery is configured for your intended audience. Supabase's default test email service is not intended as a production mail service; a verified custom SMTP provider is normally needed for dependable delivery.
