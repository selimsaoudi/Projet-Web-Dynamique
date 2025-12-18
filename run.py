from pathlib import Path
from etl.extract import extract
from etl.transform import transform
from etl.load import load
from etl.load import build_by_region
build_by_region()


def main():
    project_root = Path(__file__).resolve().parents[1]
    raw_path = project_root / "data" / "raw" / "fr-esr-insertion_professionnelle-master.csv"
    out_dir  = project_root / "data" / "processed"

    df = extract(raw_path)
    data = transform(df)
    load(data, out_dir)

    print("✅ ETL OK")
    print(" - clean:", out_dir / "clean.parquet")
    print(" - by_year:", out_dir / "by_year.json")
    print(" - by_domaine:", out_dir / "by_domaine.json")
    print(" - by_academie:", out_dir / "by_academie.json")

if __name__ == "__main__":
    main()