import pandas as pd
import numpy as np

# Colonnes numériques à convertir (si présentes)
NUMERIC_COLS = [
    "taux_de_reponse",
    "poids_de_la_discipline",
    "taux_dinsertion",
    "taux_d_emploi",
    "taux_d_emploi_salarie_en_france",
    "emplois_cadre_ou_professions_intermediaires",
    "emplois_stables",
    "emplois_a_temps_plein",
    "salaire_net_median_des_emplois_a_temps_plein",
    "salaire_brut_annuel_estime",
    "de_diplomes_boursiers",
    "taux_de_chomage_regional",
    "salaire_net_mensuel_median_regional",
    "emplois_cadre",
    "emplois_exterieurs_a_la_region_de_luniversite",
    "femmes",
    "salaire_net_mensuel_regional_1er_quartile",
    "salaire_net_mensuel_regional_3eme_quartile",
    "nombre_de_reponses",
]

# Colonnes "taux" à standardiser dans [0,1]
RATE_COLS = [
    "taux_de_reponse",
    "taux_dinsertion",
    "taux_d_emploi",
    "taux_d_emploi_salarie_en_france",
    "emplois_cadre_ou_professions_intermediaires",
    "emplois_stables",
    "emplois_a_temps_plein",
    "de_diplomes_boursiers",
    "taux_de_chomage_regional",
    "emplois_cadre",
    "emplois_exterieurs_a_la_region_de_luniversite",
    "femmes",
]

# Colonnes inutiles (si elles existent)
DROP_COLS = [
    "etablissementactuel",
    "cle_etab",
    "cle_disc",
    "id_paysage",
    "remarque",
    "numero_de_l_etablissement",
]

def _to_num(series: pd.Series) -> pd.Series:
    """Convertit en numérique en gérant virgules + 'ns'."""
    return pd.to_numeric(
        series.astype(str)
              .str.strip()
              .str.replace(",", ".", regex=False)
              .replace({"ns": np.nan, "nan": np.nan, "None": np.nan, "": np.nan}),
        errors="coerce",
    )

def _standardize_rate_col(s: pd.Series) -> pd.Series:
    """
    Si la colonne est en % (max > 1.5), on divise par 100.
    Puis on clip dans [0,1].
    """
    s = s.copy()
    if s.notna().any():
        mx = s.dropna().max()
        if mx is not None and mx > 1.5:
            s = s / 100.0
    return s.clip(lower=0, upper=1)

def transform(df: pd.DataFrame) -> pd.DataFrame:
    data = df.copy()

    # 1) Normalisation des noms de colonnes (évite espaces cachés)
    data.columns = [c.strip() for c in data.columns]

    # 2) Aliases pour gérer les variations de noms (IMPORTANT pour taux d'emploi)
    ALIASES = {
        "taux_emploi": "taux_d_emploi",
        "taux d emploi": "taux_d_emploi",
        "taux d'emploi": "taux_d_emploi",
        "taux d’emploi": "taux_d_emploi",
    }
    for k, v in ALIASES.items():
        if k in data.columns and v not in data.columns:
            data = data.rename(columns={k: v})

    # 3) Drop colonnes inutiles
    for c in DROP_COLS:
        if c in data.columns:
            data = data.drop(columns=c)

    # 4) Conversion numérique
    for c in NUMERIC_COLS:
        if c in data.columns:
            data[c] = _to_num(data[c])

    # 5) Standardisation des taux dans [0,1]
    for c in RATE_COLS:
        if c in data.columns:
            data[c] = _standardize_rate_col(data[c])

    # 6) Filtrage minimum (on a besoin d'un taux d'insertion exploitable)
    if "taux_dinsertion" in data.columns:
        data = data.dropna(subset=["taux_dinsertion"])

    # 7) Variable binaire (optionnelle)
    if "taux_dinsertion" in data.columns and len(data) > 0:
        seuil = data["taux_dinsertion"].quantile(0.75)
        data["insertion_ok"] = (data["taux_dinsertion"] >= seuil).astype(int)
    else:
        data["insertion_ok"] = 0

    # 8) DEBUG PRO : comprendre pourquoi taux_d_emploi devient null
    print("✅ DEBUG transform")
    print(" - colonnes:", "taux_d_emploi" in data.columns, "/ taux_dinsertion:", "taux_dinsertion" in data.columns)
    if "taux_d_emploi" in data.columns:
        nan_count = int(data["taux_d_emploi"].isna().sum())
        print(f" - taux_d_emploi NaN: {nan_count}/{len(data)}")
        print(" - taux_d_emploi min/max:", data["taux_d_emploi"].min(), data["taux_d_emploi"].max())
    else:
        print(" - ❌ taux_d_emploi ABSENT (check nom exact dans CSV)")

    return data