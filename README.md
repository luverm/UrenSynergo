# Uren Overzicht — Synergo

Visueel dashboard voor urenregistratie met online opslag via Supabase.
Uren resetten automatisch elke 18e van de maand.

## Setup

### 1. Supabase project aanmaken
1. Ga naar [supabase.com](https://supabase.com) en maak een gratis account
2. Klik **New Project** en kies een naam + wachtwoord
3. Ga naar **SQL Editor** en plak de inhoud van `supabase-setup.sql`
4. Klik **Run**

### 2. Environment variables instellen
1. Ga in Supabase naar **Settings → API**
2. Kopieer je **Project URL** en **anon public key**
3. Maak een `.env` bestand aan:

```
VITE_SUPABASE_URL=https://jouw-project.supabase.co
VITE_SUPABASE_ANON_KEY=jouw-anon-key
```

### 3. Lokaal draaien

```bash
npm install
npm run dev
```

### 4. Deployen via Vercel
1. Push naar GitHub
2. Ga naar [vercel.com](https://vercel.com) en importeer de repo
3. Voeg onder **Settings → Environment Variables** toe:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Klik **Deploy**
