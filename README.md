# Cards

Anonymous multiplayer card tables, starting with Oh Hell.

Live at [jacobrobertsbaca.github.io/cards](https://jacobrobertsbaca.github.io/cards).

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Copy `.env.example` to `.env.local` and add the Supabase URL and publishable key so tables sync across devices. Without those, games stay on this browser.

## Hosting

The site is a static export on GitHub Pages (`/cards`) with Supabase for shared game state. Pushes to `main` deploy via `.github/workflows/pages.yml`. The workflow needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` repository secrets, and the SQL in `supabase/migrations/` applied to the project.
