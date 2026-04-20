from pathlib import Path
import sqlite3

ROOT_DIR = Path(__file__).resolve().parents[2]
SQL_ANALYSIS_DIR = ROOT_DIR / "sql" / "analysis"

def get_sample_cell_type_frequncy(con: sqlite3.Connection) -> list[dict]:
    query = (SQL_ANALYSIS_DIR / "sample_cell_type_frequency.sql").read_text()
    rows = con.execute(query).fetchall()
    return list(map(dict, rows))

def get_frequency_data(con: sqlite3.Connection) -> list[dict]:
    query = (SQL_ANALYSIS_DIR / "frequency_data.sql").read_text()
    rows = con.execute(query).fetchall()
    return list(map(dict, rows))

def get_conditions(con: sqlite3.Connection) -> list[str]:
    query = "SELECT DISTINCT condition FROM subject"
    return list(con.execute(query).fetchall())

def get_treatments(con: sqlite3.Connection) -> list[str]:
    query = "SELECT DISTINCT treatment FROM subject"
    return list(con.execute(query).fetchall())