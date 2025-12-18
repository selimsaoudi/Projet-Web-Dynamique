from pathlib import Path
import pandas as pd
import numpy as np

# ---------- helpers stats ----------
def wmean(x: pd.Series, w: pd.Series) -> float:
    x = pd.to_numeric(x, errors="coerce")
    w = pd.to_numeric(w, errors="coerce").fillna(0)
    m = x.notna() & w.gt(0)
    if m.sum() == 0:
        return float("nan")
    return float((x[m] * w[m]).sum() / w[m].sum())

def wmedian(x: pd.Series, w: pd.Series) -> float:
    # médiane pondérée (propre) : tri par x et cumul des poids
    x = pd.to_numeric(x, errors="coerce")
    w = pd.to_numeric(w, errors="coerce").fillna(0)
    m = x.notna() & w.gt(0)
    if m.sum() == 0:
        return float("nan")

    df = pd.DataFrame({"x": x[m], "w": w[m]}).sort_values("x")
    cum = df["w"].cumsum()
    cutoff = df["w"].sum() / 2.0
    return float(df.loc[cum >= cutoff, "x"].iloc[0])

# ---------- main load ----------
def load(data: pd.DataFrame, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)

    # --- Sanity checks (pour rassurer ton prof) ---
    # Taux doivent être dans [0,1]
    for c in ["taux_dinsertion", "taux_d_emploi"]:
        if c in data.columns:
            mn, mx = data[c].min(), data[c].max()
            if (mn < -0.01) or (mx > 1.01):
                print(f"⚠️ WARNING: {c} hors [0,1] -> min={mn}, max={mx}")

    # nombre_de_reponses doit être >= 0
    if "nombre_de_reponses" in data.columns:
        neg = (data["nombre_de_reponses"].fillna(0) < 0).sum()
        if neg > 0:
            print(f"⚠️ WARNING: nombre_de_reponses négatif sur {neg} lignes")

    # --- Export dataset nettoyé ---
    data.to_parquet(out_dir / "clean.parquet", index=False)

    # Poids
    w = data["nombre_de_reponses"] if "nombre_de_reponses" in data.columns else pd.Series([1]*len(data))

    # --- Agrégats par année (pondérés) ---
    by_year = (
        data.groupby("annee", as_index=False)
            .apply(lambda g: pd.Series({
                "taux_dinsertion_moy": wmean(g["taux_dinsertion"], g["nombre_de_reponses"]),
                "taux_emploi_moy": wmean(g["taux_d_emploi"], g["nombre_de_reponses"]),
                "salaire_median": wmedian(g["salaire_net_median_des_emplois_a_temps_plein"], g["nombre_de_reponses"]),
                "n": float(pd.to_numeric(g["nombre_de_reponses"], errors="coerce").fillna(0).sum())
            }))
            .reset_index(drop=True)
            .sort_values("annee")
    )
    by_year.to_json(out_dir / "by_year.json", orient="records", force_ascii=False)

    # --- Agrégats par domaine (pondérés) ---
    by_domaine = (
        data.groupby("domaine", as_index=False)
            .apply(lambda g: pd.Series({
                "taux_dinsertion_moy": wmean(g["taux_dinsertion"], g["nombre_de_reponses"]),
                "taux_emploi_moy": wmean(g["taux_d_emploi"], g["nombre_de_reponses"]),
                "salaire_median": wmedian(g["salaire_net_median_des_emplois_a_temps_plein"], g["nombre_de_reponses"]),
                "n": float(pd.to_numeric(g["nombre_de_reponses"], errors="coerce").fillna(0).sum())
            }))
            .reset_index(drop=True)
            .sort_values("taux_dinsertion_moy", ascending=False)
    )
    by_domaine.to_json(out_dir / "by_domaine.json", orient="records", force_ascii=False)

    # --- Agrégats par académie (pondérés) ---
    by_academie = (
        data.groupby("academie", as_index=False)
            .apply(lambda g: pd.Series({
                "taux_dinsertion_moy": wmean(g["taux_dinsertion"], g["nombre_de_reponses"]),
                "taux_emploi_moy": wmean(g["taux_d_emploi"], g["nombre_de_reponses"]),
                "salaire_median": wmedian(g["salaire_net_median_des_emplois_a_temps_plein"], g["nombre_de_reponses"]),
                "n": float(pd.to_numeric(g["nombre_de_reponses"], errors="coerce").fillna(0).sum())
            }))
            .reset_index(drop=True)
            .sort_values("taux_dinsertion_moy", ascending=False)
    )
    by_academie.to_json(out_dir / "by_academie.json", orient="records", force_ascii=False)


# --- mapping "académie" -> "région" (noms compatibles GeoJSON) ---
ACADEMY_TO_REGION = {
    # Métropole
    "Auvergne-Rhône-Alpes": "Auvergne-Rhône-Alpes",
    "Clermont-Ferrand": "Auvergne-Rhône-Alpes",
    "Grenoble": "Auvergne-Rhône-Alpes",
    "Lyon": "Auvergne-Rhône-Alpes",

    "Bourgogne-Franche-Comté": "Bourgogne-Franche-Comté",
    "Besançon": "Bourgogne-Franche-Comté",
    "Dijon": "Bourgogne-Franche-Comté",

    "Bretagne": "Bretagne",
    "Rennes": "Bretagne",

    "Centre-Val de Loire": "Centre-Val de Loire",
    "Orléans-Tours": "Centre-Val de Loire",

    "Corse": "Corse",

    "Grand Est": "Grand Est",
    "Nancy-Metz": "Grand Est",
    "Reims": "Grand Est",
    "Strasbourg": "Grand Est",

    "Hauts-de-France": "Hauts-de-France",
    "Amiens": "Hauts-de-France",
    "Lille": "Hauts-de-France",

    "Île-de-France": "Île-de-France",
    "Créteil": "Île-de-France",
    "Paris": "Île-de-France",
    "Versailles": "Île-de-France",

    "Normandie": "Normandie",

    "Nouvelle-Aquitaine": "Nouvelle-Aquitaine",
    "Bordeaux": "Nouvelle-Aquitaine",
    "Limoges": "Nouvelle-Aquitaine",
    "Poitiers": "Nouvelle-Aquitaine",

    "Occitanie": "Occitanie",
    "Montpellier": "Occitanie",
    "Toulouse": "Occitanie",

    "Pays de la Loire": "Pays de la Loire",
    "Nantes": "Pays de la Loire",

    "Provence-Alpes-Côte d'Azur": "Provence-Alpes-Côte d'Azur",
    "Aix-Marseille": "Provence-Alpes-Côte d'Azur",
    "Nice": "Provence-Alpes-Côte d'Azur",

    # Outre-mer (noms GeoJSON)
    "Guadeloupe": "Guadeloupe",
    "Guyane": "Guyane",
    "Martinique": "Martinique",
    "Mayotte": "Mayotte",
    "Réunion": "La Réunion",
    "La Réunion": "La Réunion",
}


def _pick_col(df, candidates):
    for c in candidates:
        if c in df.columns:
            return c
    return None


def _wmean(x, w):
    x = pd.to_numeric(x, errors="coerce")
    w = pd.to_numeric(w, errors="coerce").fillna(0)
    m = x.notna() & (w > 0)
    if m.sum() == 0:
        return np.nan
    return float((x[m] * w[m]).sum() / w[m].sum())


def _wmedian(x, w):
    x = pd.to_numeric(x, errors="coerce")
    w = pd.to_numeric(w, errors="coerce").fillna(0)
    m = x.notna() & (w > 0)
    if m.sum() == 0:
        return np.nan
    x = x[m].to_numpy()
    w = w[m].to_numpy()
    idx = np.argsort(x)
    x = x[idx]
    w = w[idx]
    cw = np.cumsum(w)
    cut = w.sum() / 2.0
    return float(x[np.searchsorted(cw, cut)])


def build_by_region():
    clean_path = Path("data/processed/clean.parquet")
    out_path = Path("data/processed/by_region.json")

    df = pd.read_parquet(clean_path)

    # Colonnes "clé" (on détecte selon ton parquet)
    col_academie = _pick_col(df, ["academie", "Académie", "nom_academie"])
    col_w = _pick_col(df, ["nombre_de_reponses", "n", "reponses", "nb_reponses"])
    col_insert = _pick_col(df, ["taux_dinsertion", "taux_d_insertion", "taux_insertion"])
    col_salary = _pick_col(df, ["salaire_net_median_des_emplois_a_temps_plein", "salaire_median", "salaire_net_median"])

    if not all([col_academie, col_w, col_insert, col_salary]):
        missing = [("academie", col_academie), ("poids(n)", col_w), ("insertion", col_insert), ("salaire", col_salary)]
        raise ValueError(f"Colonnes introuvables: {missing}. Ouvre clean.parquet et vérifie les noms.")

    tmp = df[[col_academie, col_w, col_insert, col_salary]].copy()
    tmp.rename(columns={
        col_academie: "academie",
        col_w: "n",
        col_insert: "taux_dinsertion",
        col_salary: "salaire"
    }, inplace=True)

    tmp["region"] = tmp["academie"].map(ACADEMY_TO_REGION)
    tmp = tmp.dropna(subset=["region"])

    by_region = (
        tmp.groupby("region", as_index=False)
           .apply(lambda g: pd.Series({
               "taux_dinsertion_moy": _wmean(g["taux_dinsertion"], g["n"]),
               "salaire_median": _wmedian(g["salaire"], g["n"]),
               "n": float(pd.to_numeric(g["n"], errors="coerce").fillna(0).sum())
           }))
           .reset_index(drop=True)
           .sort_values("taux_dinsertion_moy", ascending=False)
    )

    by_region.to_json(out_path, orient="records", force_ascii=False)
    print(f"[OK] by_region: {out_path}")