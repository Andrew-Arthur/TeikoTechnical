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


def test_dashboard_data_endpoint(client: TestClient):
    """Test dashboard_data endpoint returns frequency_data and filters."""
    response = client.get("/dashboard_data")

    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, dict)

    # Should have frequency_data
    assert "frequency_data" in data
    assert isinstance(data["frequency_data"], list)

    # Should have compact_frequency_data
    assert "compact_frequency_data" in data

    # Should have filter options
    assert "conditions" in data
    assert "treatments" in data