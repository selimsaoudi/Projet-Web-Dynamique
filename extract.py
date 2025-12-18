from pathlib import Path
import pandas as pd

def extract(raw_path: Path) -> pd.DataFrame:
    return pd.read_csv(raw_path, sep=";", low_memory=False, encoding="utf-8")