# FilmBox site: step-by-step guide

This project turns the 16 FilmBox missions into a working Next.js site (TypeScript, `pg`, no ORM).
Every section of every page shows the mission it comes from, so you can check each skill.

## What was verified, and what was not

Checked in a PostgreSQL 16 test database, starting from an empty one:

- the 10 SQL migrations replay in order with no error, and replay again safely;
- all 49 catalogue queries run with the site's limited account (`filmbox_web`);
- `noter()`, the triggers, the permissions, the row-level security and the injection-safe search give the results of the missions;
- type check and production build pass; the 17 routes answer with data; the three forms (rate, count a view, log an evening) work.

**Not verified:** `docker compose up` (no Docker daemon was available), PostgreSQL 18 (you use 18), and how the pages look in a browser (only the HTML was checked).

---

## Part 1: get it running

### Step 1. Use a new, clean folder
Unzip into a new folder, ideally without a space in its name (`filmbox-site`). Do not copy files from the old Express project (`server.js`, `queries.js`, `index.html`): they belong to another app.

### Step 2. Check the folder
```
filmbox-site/
├── GUIDE.md  .env.example  docker-compose.yml  package.json  tsconfig.json
├── scripts/load-local.sh               (loads the SQL without Docker)
├── db/
│   ├── migrations/   001_filmbox.sql … 010_securite.sql, 090_app_role.sh
│   └── seeds/        (empty: put filmbox-s3.sql here as volume.sql, step 7)
└── src/  app/ components/ lib/db/
```
`001`, `002`, `005` and `006` are your own scripts (`filmbox.sql`, `filmbox-s2.sql`, `filmbox-s4.sql`, `filmbox-s5.sql`). The numbers set the loading order, do not change them.

### Step 3. Create `.env`
```bash
cp .env.example .env
```
Edit the three values. The password inside `DATABASE_URL` must be the same as `FILMBOX_WEB_PASSWORD`. If it contains `@ : / # %`, encode it (`@` becomes `%40`).

### Step 4. Start the database: choose A or B

**A. Docker** (the setup of your README):
```bash
docker compose up -d --wait
```
The migrations only run on an empty volume. To start again from zero: `docker compose down -v && docker compose up -d --wait`.

**B. Postgres.app, no Docker** (your Mac setup, port 5431):
```bash
createdb -p 5431 filmbox        # skip this line if the filmbox database already exists
sh scripts/load-local.sh "postgres://YOUR_MAC_USER@localhost:5431/filmbox"
```
Then in `.env`: `DATABASE_URL=postgres://YOUR_MAC_USER@localhost:5431/filmbox`.

Your Mac user is a superuser, so it ignores permissions and row-level security: the pages show the full figures of the missions (29 viewings for `cinephile_92`), but M16 has no visible effect. To see the site as it would run in production, create its limited account once and use it in `DATABASE_URL`:
```bash
psql -p 5431 -d filmbox \
  -c "CREATE ROLE filmbox_web LOGIN PASSWORD 'filmbox123' IN ROLE filmbox_app" \
  -c "GRANT USAGE ON SCHEMA public TO filmbox_web" \
  -c "GRANT SELECT ON ALL TABLES IN SCHEMA public TO filmbox_web"
```
`DATABASE_URL=postgres://filmbox_web:filmbox123@localhost:5431/filmbox`

### Step 5. Start the site
```bash
npm install
npm run dev
```
Open http://localhost:3000. Your README asks for Node 22 or more, which is what I tested with. Node 20 should also work (Next.js 15 needs 18.18 or later), but I did not try it.

### Step 6. Check each page

| Page | What you should see |
|---|---|
| `/` | top rated films, the "Mon top Nolan" list, divisive films, top 3 per genre |
| `/films` | actor search (Kevin Bacon: 4 films), 2000 to 2010, epic films, 4 Best Picture winners, 5 tags, sagas |
| `/films/Inception` | sheet with "2 h 28", weighted rating, rating history, live vs cached statistics |
| `/classements` | raw vs weighted ranking, directors, active members, favourites, best episodes |
| `/tableau-de-bord` | genre indicators, ROLLUP, activity feed, triggers (M14), consistency check at 0 |
| `/membres/cinephile_92` | profile card (21 films, 4.10, Science-fiction, Seven), diary, compatibility with `nolanfan` (12 films, 0.63) |
| `/bacon` | path Kevin Bacon, X-Men : Le Commencement, James McAvoy, X-Men : Days of Future Past, Omar Sy |
| `/recherche` | `dark` gives 2 films; `x' OR '1'='1` gives none |
| `/noter` | rate (6 is refused), count a view, log an evening (Avatar cancels everything) |
| `/diagnostic` | `EXPLAIN` plans, index report, structure of `casting` |

### Step 7. Optional: the volume of session 3 (M11 and M12)
`/diagnostic` only shows slow plans with 2 million rows. Put your `filmbox-s3.sql` in `db/seeds/volume.sql`, then load it:
```bash
docker compose exec -T db psql -U postgres -d filmbox -f /seeds/volume.sql
```
Without Docker: `psql -p 5431 -d filmbox -f db/seeds/volume.sql`.

The three indexes of M12 are part of the migrations, so they already exist and `/diagnostic` would show the fast plans straight away. To measure the slow plans first (M11), remove them, then reload `/diagnostic`:
```bash
docker compose exec -T db psql -U postgres -d filmbox -c "DROP INDEX IF EXISTS idx_journal_profil, idx_journal_date, idx_films_titre_trgm"
```
To measure the fast plans (M12), create them again (safe to repeat):
```bash
docker compose exec -T db psql -U postgres -d filmbox -f /docker-entrypoint-initdb.d/007_index.sql
```
Without Docker, use `psql -p 5431 -d filmbox -c ...` and `-f db/migrations/007_index.sql`. Some pages become very long with 100 000 films: load the volume only while you work on `/diagnostic`. I could not test this step, because I do not have `filmbox-s3.sql`.

---

## Part 2: where each mission is

| Mission | Skill | Where |
|---|---|---|
| M1.1 | explore a database | `/diagnostic` (structure of `casting`), `\d` in psql |
| M1.2, M1.3 | `CREATE TABLE`, constraints | `003_listes.sql` |
| M1.4 | `INSERT ... SELECT`, join | `/` featured list |
| M2.1 to M2.5 | filters, joins, `GROUP BY`, `HAVING` | `/films`, `/`, `/classements` |
| M3.1 to M3.3 | CTE, anti-join | `/membres/...`, `/` |
| M4.1 to M4.5 | recursive CTE | `/films` (M4.1, M4.2), `/bacon` (M4.3 to M4.5) |
| M5.1 to M5.4 | window functions | `/`, `/classements` |
| M6.1 to M6.4 | running totals, `LAG` | `/membres/...`, `/films/...` (M6.2) |
| M7.1 to M7.3 | `FILTER`, `ROLLUP` | `/tableau-de-bord` |
| M8.1 to M8.4 | JSONB, `LATERAL` | `/films`, `/tableau-de-bord` |
| M9.1 | view | `004_vues_fonctions.sql`, `/films/...` |
| M9.2 | materialized view | `/films/...` (live vs cache) |
| M9.3 | updatable view, `WITH CHECK OPTION` | `004_vues_fonctions.sql`, psql only |
| M10.1 to M10.3 | SQL and PL/pgSQL functions | `004_vues_fonctions.sql`, `/films`, `/classements`, `/membres/...` |
| M11 | `EXPLAIN (ANALYZE, BUFFERS)` | `/diagnostic` |
| M12 | indexes (B-tree, covering, trigram) | `007_index.sql`, `/diagnostic` |
| M13.1, M13.2 | procedure, clear errors | `008_procedures.sql`, `/noter` |
| M13.3 | batch procedure with `COMMIT` | `009_triggers.sql` (runs at loading) |
| M14.1 to M14.3 | triggers, `WHEN`, check query | `009_triggers.sql`, `/tableau-de-bord` |
| M15.1 | lost update, two terminals | psql only (two windows) |
| M15.2 | atomic counter | `/noter` |
| M15.3 | transaction, all or nothing | `/noter` (evening form) |
| M16.1 | least privilege | `010_securite.sql`, `090_app_role.sh` |
| M16.2 | row-level security | `010_securite.sql`, visible on `/membres/...` |
| M16.3 | injection-safe search | `010_securite.sql`, `/recherche` |

---

## Part 3: what your README has and this project does not (yet)

Do these in order if you want the full README.

1. **Login and sign-up.** This is the most important gap. Today the site has no login, so anyone can rate or log viewings as any member, and the row-level security hides every private journal entry from everybody, including their owner. A login would store a password hash, remember the member in a signed cookie (`SESSION_SECRET`), and run each request's queries with `app.membre_id` set to that member. Ask me and I will build it.
2. **"Diagrammes" switch.** Bar charts instead of one-column tables.
3. **Tests.** Vitest for the unit tests, and integration tests on the Docker database.
4. **`rendus/` and `docs/`.** Your mission answers and `charte-graphique.md`. The SQL in `src/lib/db/catalog.js` and `db/migrations/` is your starting point.
5. **M12 report.** What the AI proposed, what you measured, what did not help. Only you can write it: it needs your own timings.

---

## Part 4: things to know

- **M5.2 shows 10 directors.** There are 20; I kept 10 because your expected result has 10 rows. Remove `LIMIT 10` in `catalog.js` (`m5-2`) for all of them.
- **M10.2 depends on M9.2.** The weighted rating of *Retour vers le futur* is 4.39 on a fresh database and 4.38 once `sofa_critic` has given 2/5 to *Inception* (the rating added in M9.2). Both are correct.
- **Journal figures are lower with `filmbox_web`.** `cinephile_92` shows 22 viewings, not 29, because the 7 private entries are hidden. The pages that count the journal say so.
- **`role "filmbox_app" cannot be dropped`** when loading `006`: another database on the same PostgreSQL server still uses that role. Keep one FilmBox database per server, or run `DROP OWNED BY filmbox_app;` in the other one.
- **`090_app_role.sh` only runs in Docker.** Without Docker, create `filmbox_web` by hand (step 4B).
- **`password authentication failed`:** the password in `DATABASE_URL` differs from the one used when the database was created. With Docker, change it and run `docker compose down -v && docker compose up -d --wait`.
