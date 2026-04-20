from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import sqlite3
from teiko_technical.queries import get_frequency_data, get_conditions, get_treatments
from teiko_technical.analysis import compact_frequency_data

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROOT_DIR = Path(__file__).resolve().parents[2]
DB_PATH = ROOT_DIR / "data.db"

def get_con():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    try:
        yield con
    finally:
        con.close()


@app.get("/dashboard_data")
def dashboard_data(con: sqlite3.Connection = Depends(get_con)):
    frequency_data = get_frequency_data(con)
    return {
        "frequency_data": frequency_data,
        "compact_frequency_data": compact_frequency_data(frequency_data),
        "conditions" : get_conditions(con),
        "treatments" : get_treatments(con),
    }