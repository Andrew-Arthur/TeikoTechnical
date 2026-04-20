import sqlite3
from pathlib import Path
from collections import defaultdict
import pytest
from fastapi.testclient import TestClient
from teiko_technical.api import app, get_con
from teiko_technical.init_db import init_db
from teiko_technical.load_csv_to_db import load_csv_to_db


@pytest.fixture
def client(tmp_path: Path):
    db_path = tmp_path / "test.db"
    schema_path = Path("sql/schema.sql")
    csv_path = Path("data/cell-count.csv")

    # setup fresh DB
    conn = init_db(db_path, schema_path)
    load_csv_to_db(conn, csv_path)
    conn.close()

    # override API dependency
    def override_get_conn():
        test_conn = sqlite3.connect(db_path)
        test_conn.row_factory = sqlite3.Row
        try:
            yield test_conn
        finally:
            test_conn.close()

    app.dependency_overrides[get_con] = override_get_conn

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def test_sample_cell_type_frequency_endpoint_shape(client: TestClient):
    response = client.get("/sample_cell_type_frequency")

    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0

    counts = defaultdict(int)
    for row in data:
        for header, expected_type in [
            ("sample"     , str),
            ("total_count", int),
            ("population" , str),
            ("count"      , int),
            ("percentage" , float)
        ]:
            assert header in row
            assert isinstance(row[header], expected_type)

        counts[row["sample"]] += row["percentage"]

    for count in counts.values():
        precision = 1e10
        assert round(count * precision) / precision == 100