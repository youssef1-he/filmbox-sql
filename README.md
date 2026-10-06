FilmBox : site et base de données

Projet fil rouge PostgreSQL (J1 – Requêtages, Vues & Fonctions). FilmBox est un réseau social de cinéphiles sur le modèle de Letterboxd : les membres notent des films, tiennent un journal de visionnage et créent des listes.

Ce dépôt contient :

les scripts de la base (db/migrations/), qui reprennent les réponses des missions M1 à M16 ;
un site web (Next.js, TypeScript, pg sans ORM) où chaque page affiche le résultat d'une ou plusieurs missions. Le titre de chaque section indique la mission correspondante (par exemple « M7.3 (ROLLUP) »).

Les scripts SQL et le site ont été vérifiés sur PostgreSQL 16. Le fichier docker-compose.yml utilise PostgreSQL 18, comme dans le cours. L'interface du site est en anglais ; les noms de tables, de colonnes et de fonctions sont ceux du cours.

1. Installation
Option A : avec Docker (recommandée)

Prérequis : Docker et Node.js 22 ou plus, comme dans le cours 

bash
cp .env.example .env          
docker compose up -d --wait  
npm install
npm run dev              

Dans .env, le mot de passe de DATABASE_URL doit être le même que FILMBOX_WEB_PASSWORD. S'il contient @ : / # %, encodez-le (@ devient %40).

Les migrations ne se rejouent que sur un volume vide. Pour repartir d'une base neuve (cela efface les notes et visionnages ajoutés depuis le site) :

bash
docker compose down -v && docker compose up -d --wait
Option B : sans Docker (Postgres.app, PostgreSQL installé sur le Mac)
bash
createdb -p 5431 filmbox      
sh scripts/load-local.sh "postgres://VOTRE_UTILISATEUR@localhost:5431/filmbox"

Puis, dans .env : DATABASE_URL=postgres://VOTRE_UTILISATEUR@localhost:5431/filmbox, et npm install, npm run dev.

Un utilisateur administrateur ignore les droits et la sécurité par ligne : les pages affichent alors tous les chiffres des missions, mais M16 n'a pas d'effet visible. Pour voir le site comme en production, créez son compte limité et utilisez-le dans DATABASE_URL :

bash
psql -p 5431 -d filmbox \
  -c "CREATE ROLE filmbox_web LOGIN PASSWORD 'filmbox123' IN ROLE filmbox_app" \
  -c "GRANT USAGE ON SCHEMA public TO filmbox_web" \
  -c "GRANT SELECT ON ALL TABLES IN SCHEMA public TO filmbox_web"

DATABASE_URL=postgres://filmbox_web:filmbox123@localhost:5431/filmbox

Le volume de la séance 3 (facultatif, pour M11 et M12)

La page /diagnostic n'est parlante qu'avec les 2 millions de lignes de la séance 3. Placez filmbox-s3.sql dans db/seeds/volume.sql, puis :

bash
docker compose exec -T db psql -U postgres -d filmbox -f /seeds/volume.sql

Le script peut durer de quelques dizaines de secondes à plusieurs minutes. Arrêtez npm run dev pendant le chargement.

Les trois index de M12 font partie des migrations : ils existent déjà. Pour mesurer d'abord les plans lents (M11) :

bash
docker compose exec -T db psql -U postgres -d filmbox -c "DROP INDEX IF EXISTS idx_journal_profil, idx_journal_date, idx_films_titre_trgm"

Puis rechargez /diagnostic. Pour mesurer les plans rapides (M12), recréez les index (sans risque si répété) :

bash
docker compose exec -T db psql -U postgres -d filmbox -f /docker-entrypoint-initdb.d/007_index.sql

Avec 100 000 films, certaines pages deviennent très longues : chargez le volume seulement pour travailler sur /diagnostic.

2. Séances, missions et pages du site
Séance	Missions	Notions	Thème	Où dans le site
1	M1	N1, N2	Prise en main	003_listes.sql, / (liste « Mon top Nolan »), /diagnostic (structure de casting)
1	M2	N3, N4, N5	Catalogue	/films, /, /classements
1	M3	N6	Profil d'un membre (CTE)	/membres/cinephile_92, /
1	M4	N7	Sagas et Kevin Bacon (CTE récursives)	/films (M4.1, M4.2), /bacon (M4.3 à M4.5)
1	M5	N8	Classements (fonctions de fenêtre)	/, /classements
1	M6	N9	Séries temporelles	/membres/..., /films/Inception (M6.2)
2	M7	N10, N11	Tableau de bord (FILTER, ROLLUP)	/tableau-de-bord
2	M8	N12, N13	JSONB et LATERAL	/films, /tableau-de-bord
2	M9	N14, N15	Vues et vue matérialisée	004_vues_fonctions.sql, /films/...
2	M10	N16, N17	Fonctions SQL et PL/pgSQL	004_vues_fonctions.sql, /classements, /membres/...
3	M11	N18, N19, N20	Diagnostic (EXPLAIN)	/diagnostic
3	M12	N21 à N25	Index et optimisation	007_index.sql, /diagnostic
4	M13	N26, N27, N28	Procédures	008_procedures.sql, 009_triggers.sql, /noter
4	M14	N29 à N33	Triggers	009_triggers.sql, /tableau-de-bord
5	M15	N34 à N37	Transactions	/noter (M15.2 et M15.3)
5	M16	N38 à N41	Sécurité	010_securite.sql, 090_app_role.sh, /recherche

Détail des missions qui ne se voient pas directement sur une page :

M9.3 (vue modifiable v_films_sf avec WITH CHECK OPTION) : créée dans 004_vues_fonctions.sql, l'erreur attendue se teste en psql.
M9.2 (vue matérialisée) : la fiche film compare les statistiques en direct (vue) et en cache (mv_stats_films). Le rafraîchissement REFRESH MATERIALIZED VIEW CONCURRENTLY se lance en psql, car il demande d'être propriétaire de la vue.
M15.1 (vues perdues) : exercice à deux terminaux, à rejouer en psql.
M16.1 et M16.2 : les droits du compte filmbox_app et la politique de sécurité par ligne sur journal sont dans 010_securite.sql. Leurs effets se voient en psql avec SET ROLE filmbox_app;.
Les pages
Page	Contenu	Valeurs à retrouver
/	mieux notés, liste « Mon top Nolan », films qui divisent, top 3 par genre	Retour vers le futur 4,64 sur 7 notes ; 3 films dans la liste
/films	filmographie d'un acteur, années 2000 à 2010, films de plus de 2 h 30, Oscars, tags, fiches de science-fiction, sagas	Kevin Bacon : 4 films ; 10 films 2000-2010 ; 7 films fleuves ; 4 oscarisés ; 5 tags
/films/Inception	fiche (vue v_fiche_film), duree_texte(), note_ponderee(), JSONB, historique des notes, statistiques en direct et en cache	2 h 28 ; Christopher Nolan ; 5 notes, moyenne 4,60
/classements	classement brut et pondéré, réalisateurs, membres actifs, coups de cœur, meilleurs épisodes	Retour vers le futur au rang pondéré 1 ; Mathieu Kassovitz 4,75
/tableau-de-bord	coups de cœur et déceptions, SF par membre, ROLLUP, fil d'activité, films_stats, audit, contrôle de cohérence	science-fiction : 38 notes, 16 coups de cœur, 2 déceptions ; 0 film incohérent
/membres/cinephile_92	carte de profil, visionnages par mois, journal, notes comparées, films à voir, compatibilité	21 films notés, 4,10, Science-fiction, Seven ; avec nolanfan : 12 films communs, écart 0,63
/bacon	chemin vers Kevin Bacon, acteurs les plus éloignés, inaccessibles	Omar Sy : degré 2 via James McAvoy
/recherche	rechercher_films() en SQL statique	dark : 2 films ; x' OR '1'='1 : aucun
/noter	noter un film, compter une vue, enregistrer une soirée	voir ci-dessous
/diagnostic	plans EXPLAIN (ANALYZE, BUFFERS), rapport d'index, structure de casting	dépend du volume chargé

Sur /noter :

une note de 6 est refusée avec le message « Note invalide : 6 (de 0,5 à 5, par demi-point) » ;
un film absent du catalogue donne « Film inconnu : Avatar » ;
le compteur de vues s'incrémente directement dans l'UPDATE (M15.2) : deux clics donnent bien 2 vues ;
la soirée (M15.3) est enregistrée entièrement ou pas du tout : avec Avatar dans la liste, aucun visionnage n'est ajouté.
3. Les migrations

Docker rejoue les fichiers de db/migrations/ dans l'ordre alphabétique, au premier démarrage. Ne changez pas les numéros.

Fichier	Contenu
001_filmbox.sql	schéma et données (script du cours)
002_filmbox-s2.sql	colonne films.details en JSONB (script du cours)
003_listes.sql	tables listes et liste_films, liste « Mon top Nolan » (M1)
004_vues_fonctions.sql	v_fiche_film, mv_stats_films, v_films_sf, duree_texte(), note_ponderee(), compatibilite() (M9, M10)
005_filmbox-s4.sql	tables films_stats et audit_notes (script du cours)
006_filmbox-s5.sql	films.nb_vues et journal.prive (script du cours)
007_index.sql	les trois index de M12
008_procedures.sql	procédure noter() (M13.1, M13.2)
009_triggers.sql	recalculer_stats(), triggers films_stats et audit_notes (M13.3, M14)
010_securite.sql	rôle filmbox_app, sécurité par ligne sur journal, rechercher_films() (M16)
090_app_role.sh	compte filmbox_web du site (Docker uniquement)
4. Structure du dépôt
.
├── README.md
├── docker-compose.yml      
├── .env.example            
├── package.json  tsconfig.json
├── scripts/load-local.sh   
├── db/
│   ├── migrations/         
│   └── seeds/              
└── src/
    ├── app/                 
    ├── components/ui.tsx  
    └── lib/db/         
