# SUITE

International, multi-tool business web app — a single login that gives access to several
business modules backed by your existing cloud API.

## Modules

| Module                       | Status         |
| ---------------------------- | -------------- |
| 🏠 Dashboard                 | ✅ Available   |
| 📦 Inventory                 | ✅ Available (live products & categories) |
| 🧾 Invoicing                 | 🚧 Coming soon |
| 🧮 Cheque Print              | 🚧 Coming soon |
| 🏦 Bank Effect Print (Effet) | 🚧 Coming soon |
| 💳 POS Cash Register         | 🚧 Coming soon |
| ⚙️ Settings                  | ✅ Available   |

The shell, authentication, layout, routing and i18n are all in place — each remaining
module is wired into the navigation and is ready to be implemented incrementally.

## Internationalization

Built-in support for **7 languages** with full RTL layout for Arabic:

🇬🇧 English · 🇫🇷 Français · 🇸🇦 العربية · 🇪🇸 Español · 🇮🇹 Italiano · 🇮🇳 हिन्दी · 🇨🇳 中文

The selected language is persisted in `localStorage` (`suite.lang`).

## Tech stack

- [Vite](https://vitejs.dev/) + React 18 + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [react-router-dom](https://reactrouter.com/) for routing
- [react-i18next](https://react.i18next.com/) for translations
- [zustand](https://github.com/pmndrs/zustand) for state (auth)

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# then edit .env and set VITE_API_KEY to your project's API key

# 3. Run the dev server
npm run dev
```

The app expects the API gateway documented at:
`https://hycvkzijiwnmcwejvugj.supabase.co/functions/v1/api-gateway`

You can override it in `.env` via `VITE_API_BASE_URL`.

### Build

```bash
npm run build      # Type-check and build for production
npm run preview    # Preview the production build
npm run lint       # Type-check only
```

## Project structure

```
src/
├── api/client.ts          # Typed wrapper for the SUITE API gateway
├── components/            # Layout, sidebar, language switcher, route guard
├── i18n/                  # i18next setup + 7 language files
├── pages/                 # Auth, Dashboard, Inventory, Settings, ComingSoon
├── store/auth.ts          # Persistent auth store (zustand)
├── App.tsx                # Routes
└── main.tsx               # Entry point
```

## Adding a new module

1. Create a page component in `src/pages/MyModule.tsx`.
2. Add a route in `src/App.tsx`.
3. Add a sidebar entry in `src/components/Layout.tsx`.
4. Add translation keys under `modules.myModule.*` in every file in `src/i18n/locales/`.
5. Use the typed `api/client` helpers (or extend it) to talk to the backend.

## API

The full API reference is documented by the backend team. The client wrapper in
`src/api/client.ts` already covers: authentication, user profile, storage, subscription,
categories, products, product images and orders. Each call automatically attaches the
`x-api-key` header (from `VITE_API_KEY`) and the `Authorization: Bearer <token>` header
once the user is logged in.
