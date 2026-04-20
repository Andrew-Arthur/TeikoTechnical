from pathlib import Path
import sqlite3

import pytest

from teiko_technical.init_db import init_db
from teiko_technical.load_csv_to_db import load_csv_to_db


ROOT_DIR = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT_DIR / "sql" / "schema.sql"
CSV_PATH = ROOT_DIR / "data" / "cell-count.csv"


@pytest.fixture
def conn(tmp_path: Path) -> sqlite3.Connection:
    db_path = tmp_path / "test.db"
    connection = init_db(db_path, SCHEMA_PATH)
    yield connection
    connection.close()


def table_exists(conn: sqlite3.Connection, table_name: str) -> bool:
    row = conn.execute(
        """
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name = ?
        """,
        (table_name,),
    ).fetchone()
    return row is not None


def index_exists(conn: sqlite3.Connection, index_name: str) -> bool:
    row = conn.execute(
        """
        SELECT name
        FROM sqlite_master
        WHERE type = 'index' AND name = ?
        """,
        (index_name,),
    ).fetchone()
    return row is not None


def test_tables_are_created(conn: sqlite3.Connection) -> None:
    assert table_exists(conn, "project")
    assert table_exists(conn, "subject")
    assert table_exists(conn, "sample")
    assert table_exists(conn, "cell_type")
    assert table_exists(conn, "sample_cell_count")


def test_indexes_are_created(conn: sqlite3.Connection) -> None:
    assert index_exists(conn, "idx_subject_project_id")
    assert index_exists(conn, "idx_sample_subject_id")
    assert index_exists(conn, "idx_sample_cell_count_sample_id")
    assert index_exists(conn, "idx_sample_cell_count_cell_type_id")


def test_cell_types_are_seeded(conn: sqlite3.Connection) -> None:
    rows = conn.execute(
        """
        SELECT cell_type_name
        FROM cell_type
        ORDER BY cell_type_name
        """
    ).fetchall()

    assert [row[0] for row in rows] == sorted(
        ["b_cell", "cd8_t_cell", "cd4_t_cell", "nk_cell", "monocyte"]
    )


def test_foreign_keys_are_enabled(conn: sqlite3.Connection) -> None:
    enabled = conn.execute("PRAGMA foreign_keys").fetchone()[0]
    assert enabled == 1


def test_subject_project_foreign_key_is_enforced(conn: sqlite3.Connection) -> None:
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(
            """
            INSERT INTO subject (
                subject_id, project_id, condition, age, sex, treatment, response, sample_type
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            ("subj_1", "missing_project", "melanoma", 45, "M", "miraclib", "yes", "PBMC"),
        )


def test_sample_subject_foreign_key_is_enforced(conn: sqlite3.Connection) -> None:
    conn.execute("INSERT INTO project (project_id) VALUES (?)", ("proj_1",))

    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(
            """
            INSERT INTO sample (
                sample_id, subject_id, time_from_treatment_start
            )
            VALUES (?, ?, ?)
            """,
            ("sample_1", "missing_subject", 0),
        )


def test_sample_cell_count_foreign_keys_are_enforced(conn: sqlite3.Connection) -> None:
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(
            """
            INSERT INTO sample_cell_count (sample_id, cell_type_id, cell_count)
            VALUES (?, ?, ?)
            """,
            ("missing_sample", 1, 100),
        )


def test_check_constraints_are_enforced(conn: sqlite3.Connection) -> None:
    conn.execute("INSERT INTO project (project_id) VALUES (?)", ("proj_1",))

    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(
            """
            INSERT INTO subject (
                subject_id, project_id, condition, age, sex, treatment, response
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            ("subj_1", "proj_1", "melanoma", 45, "X", "miraclib", "yes"),
        )

    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(
            """
            INSERT INTO subject (
                subject_id, project_id, condition, age, sex, treatment, response
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            ("subj_2", "proj_1", "melanoma", -1, "M", "miraclib", "yes"),
        )


def test_load_csv_populates_tables(conn: sqlite3.Connection) -> None:
    load_csv_to_db(conn, CSV_PATH)

    project_count = conn.execute("SELECT COUNT(*) FROM project").fetchone()[0]
    subject_count = conn.execute("SELECT COUNT(*) FROM subject").fetchone()[0]
    sample_count = conn.execute("SELECT COUNT(*) FROM sample").fetchone()[0]
    cell_count_rows = conn.execute("SELECT COUNT(*) FROM sample_cell_count").fetchone()[0]

    assert project_count > 0
    assert subject_count > 0
    assert sample_count > 0
    assert cell_count_rows == sample_count * 5


def test_each_sample_has_five_population_rows(conn: sqlite3.Connection) -> None:
    load_csv_to_db(conn, CSV_PATH)

    rows = conn.execute(
        """
        SELECT sample_id, COUNT(*)
        FROM sample_cell_count
        GROUP BY sample_id
        """
    ).fetchall()

    assert rows
    assert all(count == 5 for _, count in rows)


def test_loading_csv_is_idempotent(conn: sqlite3.Connection) -> None:
    load_csv_to_db(conn, CSV_PATH)

    first_counts = {
        "project": conn.execute("SELECT COUNT(*) FROM project").fetchone()[0],
        "subject": conn.execute("SELECT COUNT(*) FROM subject").fetchone()[0],
        "sample": conn.execute("SELECT COUNT(*) FROM sample").fetchone()[0],
        "sample_cell_count": conn.execute("SELECT COUNT(*) FROM sample_cell_count").fetchone()[0],
    }

    load_csv_to_db(conn, CSV_PATH)

    second_counts = {
        "project": conn.execute("SELECT COUNT(*) FROM project").fetchone()[0],
        "subject": conn.execute("SELECT COUNT(*) FROM subject").fetchone()[0],
        "sample": conn.execute("SELECT COUNT(*) FROM sample").fetchone()[0],
        "sample_cell_count": conn.execute("SELECT COUNT(*) FROM sample_cell_count").fetchone()[0],
    }

    assert first_counts == second_counts