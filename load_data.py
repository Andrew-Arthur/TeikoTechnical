from pathlib import Path
from teiko_technical.init_db import init_db
from teiko_technical.load_csv_to_db import load_csv_to_db

ROOT_DIR = Path(__file__).resolve().parent
SQL_DIR = ROOT_DIR / "sql"
DATA_DIR = ROOT_DIR / "data"

DB_PATH = ROOT_DIR / "data.db"
SCHEMA_PATH = SQL_DIR / "schema.sql"
CSV_PATH = DATA_DIR / "cell-count.csv"

def main():
    con = init_db(DB_PATH, SCHEMA_PATH)
    try:
        load_csv_to_db(con, CSV_PATH)
    finally:
        con.close()

if __name__ == "__main__":
    main()