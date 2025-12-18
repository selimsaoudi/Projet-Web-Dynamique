# Dataviz – Insertion des diplomes de Master

## Problematique
Quels facteurs (domaine, academie, mix femmes/boursiers, salaires) sont associes a une forte insertion professionnelle, et comment cela evolue selon les annees ?

## Structure du repo
- `etl/` : pipeline Extract -> Transform -> Load (produit les jeux `data/processed/`)
- `web/` : Flask + Plotly (frontend multi-pages)
- `data/raw/` : donnees sources (CSV)
- `data/processed/` : outputs ETL (parquet + JSON utilises par le front)

## Pages disponibles (navigation)
- Vue globale : tendance insertion/salaire par annee.
- Domaines : comparatif des domaines (insertion, salaires, n).
- Academies : comparatif academies + carte regions.
- Genre : focus mix femmes vs insertion (barres par domaine + evolution annuelle).
- Equite : focus boursiers vs insertion (barres par domaine).
- Conclusion : synthese textuelle (KPI, reponses rapides).


## Installation
```bash
python -m venv .venv
# Windows : .venv\Scripts\activate
source .venv/bin/activate
pip install -r requirements.txt
```

## Lancer l’ETL (si besoin de regenir les outputs)
```bash
python etl/transform.py
```

## Lancer le serveur web
```bash
cd web
flask --app app run  # par defaut sur http://127.0.0.1:5000
```

## Donnees/Endpoints clefs
- `data/processed/clean.parquet` : base propre (utilisee par l’API).
- APIs principales : `/api/by_year`, `/api/by_domaine`, `/api/by_academie`, `/api/by_region`, `/api/genre_by_domaine`, `/api/genre_by_year`, `/api/equite_by_domaine`.

## Rappels
- Corrélation != causalité ; toujours regarder les effectifs `n` sur les comparaisons.
