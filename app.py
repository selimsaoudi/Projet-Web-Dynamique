from flask import Flask, render_template, jsonify
from pathlib import Path
import json
from functools import lru_cache
import pandas as pd

app = Flask(__name__, template_folder="templates", static_folder="static")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"

ACADEMY_COORDS = {
    # coordonnées approximatives (chefs-lieux d’académie)
    "Aix-Marseille": (43.2965, 5.3698),
    "Amiens": (49.8941, 2.2958),
    "Besançon": (47.2378, 6.0241),
    "Bordeaux": (44.8378, -0.5792),
    "Clermont-Ferrand": (45.7772, 3.0870),
    "Corse": (41.9192, 8.7386),
    "Créteil": (48.7904, 2.4556),
    "Dijon": (47.3220, 5.0415),
    "Grenoble": (45.1885, 5.7245),
    "Guadeloupe": (16.2410, -61.5330),
    "Guyane": (4.9224, -52.3135),
    "Lille": (50.6292, 3.0573),
    "Limoges": (45.8336, 1.2611),
    "Lyon": (45.7640, 4.8357),
    "Martinique": (14.6161, -61.0588),
    "Mayotte": (-12.7800, 45.2270),
    "Montpellier": (43.6108, 3.8767),
    "Nancy-Metz": (48.6921, 6.1844),
    "Nantes": (47.2184, -1.5536),
    "Nice": (43.7102, 7.2620),
    "Normandie": (49.1829, -0.3707),
    "Orléans-Tours": (47.9029, 1.9093),
    "Paris": (48.8566, 2.3522),
    "Poitiers": (46.5802, 0.3404),
    "Reims": (49.2583, 4.0317),
    "Rennes": (48.1173, -1.6778),
    "Réunion": (-20.8789, 55.4481),
    "Strasbourg": (48.5734, 7.7521),
    "Toulouse": (43.6047, 1.4442),
    "Versailles": (48.8049, 2.1204),
}


@lru_cache(maxsize=16)
def read_json(filename: str):
    path = PROCESSED_DIR / filename
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

@lru_cache(maxsize=4)
def read_parquet():
    path = PROCESSED_DIR / "clean.parquet"
    return pd.read_parquet(path)


@app.route("/")
def index():
    return render_template("index.html")

@app.route("/domaines")
def domaines():
    return render_template("domaines.html")

@app.route("/academies")
def academies():
    return render_template("academies.html")

@app.route("/genre")
def genre():
    return render_template("genre.html")

@app.route("/equite")
def equite():
    return render_template("equite.html")

@app.route("/conclusion")
def conclusion():
    return render_template("conclusion.html")

# --- API (le front fetch ces endpoints) ---
@app.route("/api/by_year")
def api_by_year():
    return jsonify(read_json("by_year.json"))

@app.route("/api/by_domaine")
def api_by_domaine():
    df = read_parquet()
    if "domaine" not in df.columns:
        return jsonify([])
    df = df.copy()
    df["n_effectif"] = df["nombre_de_reponses"].fillna(0)
    df["salaire_x_n"] = df["salaire_net_median_des_emplois_a_temps_plein"] * df["n_effectif"]
    agg = df.groupby("domaine").agg(
        taux_dinsertion_moy=("taux_dinsertion", "mean"),
        salaire_median=("salaire_net_median_des_emplois_a_temps_plein", "median"),
        salaire_moyen_num=("salaire_x_n", "sum"),
        salaire_moyen_den=("n_effectif", "sum"),
        n=("nombre_de_reponses", "sum")
    )
    agg["salaire_moyen"] = agg.apply(
        lambda r: (r["salaire_moyen_num"] / r["salaire_moyen_den"]) if r["salaire_moyen_den"] else None,
        axis=1
    )
    agg = agg.drop(columns=["salaire_moyen_num", "salaire_moyen_den"])
    agg = agg.reset_index()
    agg = agg.astype(object).where(pd.notnull(agg), None)
    return jsonify(agg.to_dict(orient="records"))

@app.route("/api/by_academie")
def api_by_academie():
    return jsonify(read_json("by_academie.json"))

@app.route("/api/genre_by_domaine")
def api_genre_by_domaine():
    df = read_parquet().copy()
    if "domaine" not in df.columns or "femmes" not in df.columns:
        return jsonify([])
    df["n_effectif"] = df["nombre_de_reponses"].fillna(0)
    df["salaire_x_n"] = df["salaire_net_median_des_emplois_a_temps_plein"] * df["n_effectif"]
    agg = df.groupby("domaine").agg(
        taux_dinsertion_moy=("taux_dinsertion", "mean"),
        part_femmes=("femmes", "mean"),
        n=("nombre_de_reponses", "sum"),
        salaire_median=("salaire_net_median_des_emplois_a_temps_plein", "median"),
        salaire_moyen_num=("salaire_x_n", "sum"),
        salaire_moyen_den=("n_effectif", "sum")
    )
    agg["salaire_moyen"] = agg.apply(
        lambda r: (r["salaire_moyen_num"] / r["salaire_moyen_den"]) if r["salaire_moyen_den"] else None,
        axis=1
    )
    agg = agg.drop(columns=["salaire_moyen_num", "salaire_moyen_den"]).reset_index()
    agg = agg.astype(object).where(pd.notnull(agg), None)
    return jsonify(agg.to_dict(orient="records"))

@app.route("/api/genre_by_year")
def api_genre_by_year():
    df = read_parquet().copy()
    if "annee" not in df.columns or "femmes" not in df.columns:
        return jsonify([])
    agg = (
        df.groupby("annee")
        .agg({
            "taux_dinsertion": "mean",
            "femmes": "mean",
            "nombre_de_reponses": "sum"
        })
        .reset_index()
        .rename(columns={
            "taux_dinsertion": "taux_dinsertion_moy",
            "femmes": "part_femmes",
            "nombre_de_reponses": "n"
        })
    )
    agg = agg.astype(object).where(pd.notnull(agg), None)
    return jsonify(agg.to_dict(orient="records"))

@app.route("/api/equite_by_domaine")
def api_equite_by_domaine():
    df = read_parquet().copy()
    if "domaine" not in df.columns or "de_diplomes_boursiers" not in df.columns:
        return jsonify([])
    df["n_effectif"] = df["nombre_de_reponses"].fillna(0)
    agg = df.groupby("domaine").agg(
        taux_dinsertion_moy=("taux_dinsertion", "mean"),
        part_boursiers=("de_diplomes_boursiers", "mean"),
        n=("nombre_de_reponses", "sum"),
        salaire_median=("salaire_net_median_des_emplois_a_temps_plein", "median")
    ).reset_index()
    agg = agg.astype(object).where(pd.notnull(agg), None)
    return jsonify(agg.to_dict(orient="records"))

@app.route("/api/academies_map")
def api_academies_map():
    data = read_json("by_academie.json")
    out = []
    for r in data:
        name = r.get("academie")
        if name in ACADEMY_COORDS:
            lat, lon = ACADEMY_COORDS[name]
            out.append({**r, "lat": lat, "lon": lon})
    return jsonify(out)

@app.route("/api/by_region")
def api_by_region():
    return jsonify(read_json("by_region.json"))

if __name__ == "__main__":
    app.run(debug=True)
