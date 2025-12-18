# Dataviz — Insertion professionnelle des diplômés de Master

## Problématique
Quels facteurs (domaine, académie, salaires…) sont associés à une forte insertion professionnelle, et comment cela évolue selon les années ?

## Structure
- `etl/` : pipeline Extract → Transform → Load (génère les données prêtes pour le dashboard)
- `web/` : site Flask + dataviz Plotly (multi-pages)
- `data/raw/` : dataset source (CSV)
- `data/processed/` : outputs ETL (parquet + JSON)

## Installation
```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate
pip install -r requirements.txt

