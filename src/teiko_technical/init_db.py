from pathlib import Path
import sqlite3

def init_db(db_path: Path, schema_path: Path) -> sqlite3.Connection:
    con = sqlite3.connect(db_path)

    try:
        con.execute("PRAGMA foreign_keys = ON")

        with schema_path.open("r") as file:
            con.executescript(file.read())

    except Exception:
        con.close()
        raise

    return con