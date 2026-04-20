from pathlib import Path
import csv
import sqlite3

CELL_TYPES = ("b_cell", "cd8_t_cell", "cd4_t_cell", "nk_cell", "monocyte")

def load_csv_to_db(con: sqlite3.Connection, csv_path: Path) -> None:
    cur = con.cursor()

    cell_type_ids = dict(
        cur.execute("SELECT cell_type_name, cell_type_id FROM cell_type")
    )

    with csv_path.open() as file:
        reader = csv.DictReader(file)

        for row in reader:
            insert_row(cur, row, cell_type_ids)

    con.commit()

def insert_row(cur: sqlite3.Cursor, row: dict[str, str], cell_type_ids: dict[str, int]) -> None:
    project_id = row["project"]
    subject_id = row["subject"]
    condition = row["condition"]
    age = int(row["age"])
    sex = row["sex"]
    treatment = row["treatment"]
    response = row["response"] or None
    sample_id = row["sample"]
    sample_type = row["sample_type"]
    time_from_treatment_start = int(row["time_from_treatment_start"])

    cur.execute(
        "INSERT OR IGNORE INTO project VALUES (?)",
        (project_id,)
    )
    cur.execute(
        """
        INSERT OR IGNORE INTO subject
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (subject_id, project_id, condition, age, sex, treatment, response, sample_type)
    )
    cur.execute(
        """
        INSERT OR IGNORE INTO sample
        VALUES (?, ?, ?)
        """,
        (sample_id, subject_id, time_from_treatment_start),
    )
    cur.executemany(
        """
        INSERT OR REPLACE INTO sample_cell_count
        VALUES (?, ?, ?)
        """,
        [
            (sample_id, cell_type_ids[cell_type], int(row[cell_type]))
            for cell_type in CELL_TYPES
        ],
    )