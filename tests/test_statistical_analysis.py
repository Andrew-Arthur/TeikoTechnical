"""Tests for statistical analysis endpoints and functions."""
import pytest
from fastapi.testclient import TestClient
from pathlib import Path
import sqlite3
from teiko_technical.api import app, get_con
from teiko_technical.init_db import init_db
from teiko_technical.load_csv_to_db import load_csv_to_db


@pytest.fixture
def client(tmp_path: Path):
    """Create test client with temporary database."""
    db_path = tmp_path / "test.db"
    schema_path = Path(__file__).resolve().parents[1] / "sql" / "schema.sql"
    con = init_db(db_path, schema_path)

    csv_path = Path(__file__).resolve().parents[1] / "data" / "cell-count.csv"
    load_csv_to_db(con, csv_path)
    con.close()

    def override_get_conn():
        con = sqlite3.connect(db_path)
        con.row_factory = sqlite3.Row
        try:
            yield con
        finally:
            con.close()

    app.dependency_overrides[get_con] = override_get_conn

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def test_statistical_tests_endpoint_exists(client: TestClient):
    """Test that statistical tests endpoint exists and returns data."""
    response = client.post(
        "/statistical_tests?level=subject&aggregation_method=mean&comparison_column=response&display_mode=percentage"
    )

    assert response.status_code == 200
    data = response.json()

    # Check structure
    assert "results_per_cell_type" in data
    assert "comparison_column" in data
    assert "groups" in data
    assert "test_type" in data
    assert "test_display_name" in data
    assert "correction_method" in data
    assert "interpretation" in data


def test_statistical_tests_returns_all_cell_types(client: TestClient):
    """Test that statistical tests return results for all 5 cell types."""
    response = client.post(
        "/statistical_tests?level=subject&aggregation_method=mean&comparison_column=response&display_mode=percentage"
    )

    data = response.json()
    results = data["results_per_cell_type"]

    assert len(results) == 5, "Should have results for all 5 cell types"

    cell_types = {r["cell_type"] for r in results}
    expected_types = {"b_cell", "cd8_t_cell", "cd4_t_cell", "nk_cell", "monocyte"}
    assert cell_types == expected_types


def test_statistical_tests_subject_level_uses_appropriate_test(client: TestClient):
    """Test that subject level with aggregation uses Mann-Whitney or Kruskal-Wallis."""
    response = client.post(
        "/statistical_tests?level=subject&aggregation_method=mean&comparison_column=response&display_mode=percentage"
    )

    data = response.json()

    # Subject level with aggregation should use non-parametric tests
    assert data["test_type"] in ["mann_whitney", "kruskal_wallis"]

    # Check that test_display_name is set
    assert len(data["test_display_name"]) > 0


def test_statistical_tests_sample_level_uses_mixed_effects(client: TestClient):
    """Test that sample level uses mixed-effects model (or fallback)."""
    response = client.post(
        "/statistical_tests?level=sample&comparison_column=response&display_mode=percentage"
    )

    data = response.json()

    # Sample level should use mixed-effects or fallback
    assert data["test_type"] in ["mixed_effects", "kruskal_wallis"]


def test_statistical_tests_with_filters(client: TestClient):
    """Test that statistical tests respect filters."""
    # Get unfiltered results
    response_all = client.post(
        "/statistical_tests?level=subject&aggregation_method=mean&comparison_column=sex&display_mode=percentage"
    )
    data_all = response_all.json()

    # Get filtered results
    response_filtered = client.post(
        "/statistical_tests?level=subject&aggregation_method=mean&comparison_column=sex&display_mode=percentage&condition=melanoma"
    )
    data_filtered = response_filtered.json()

    # Both should succeed
    assert response_all.status_code == 200
    assert response_filtered.status_code == 200

    # Filtered might have different sample sizes
    # Just verify structure is consistent
    assert len(data_all["results_per_cell_type"]) == len(data_filtered["results_per_cell_type"])


def test_statistical_tests_uses_fdr_correction(client: TestClient):
    """Test that FDR correction is applied."""
    response = client.post(
        "/statistical_tests?level=subject&aggregation_method=mean&comparison_column=response&display_mode=percentage"
    )

    data = response.json()

    assert data["correction_method"] == "fdr_bh"
    assert data["alpha"] == 0.05

    # Check that adjusted p-values exist and are >= raw p-values
    for result in data["results_per_cell_type"]:
        assert "p_value" in result
        assert "adjusted_p_value" in result
        assert result["adjusted_p_value"] >= result["p_value"]


def test_statistical_tests_effect_sizes(client: TestClient):
    """Test that effect sizes are calculated."""
    response = client.post(
        "/statistical_tests?level=subject&aggregation_method=mean&comparison_column=response&display_mode=percentage"
    )

    data = response.json()

    for result in data["results_per_cell_type"]:
        assert "effect_size" in result
        assert "effect_size_interpretation" in result

        # If effect size is not null, interpretation should be set
        if result["effect_size"] is not None:
            assert result["effect_size_interpretation"] in ["small", "medium", "large"]


def test_statistical_tests_group_sample_sizes(client: TestClient):
    """Test that group sample sizes are reported."""
    response = client.post(
        "/statistical_tests?level=subject&aggregation_method=mean&comparison_column=sex&display_mode=percentage"
    )

    data = response.json()

    for result in data["results_per_cell_type"]:
        assert "group_sample_sizes" in result
        assert isinstance(result["group_sample_sizes"], dict)
        assert len(result["group_sample_sizes"]) >= 2  # At least 2 groups


def test_statistical_tests_comparison_column_none(client: TestClient):
    """Test that comparison_column=none returns appropriate message."""
    response = client.post(
        "/statistical_tests?level=subject&aggregation_method=mean&comparison_column=none&display_mode=percentage"
    )

    data = response.json()

    assert data["test_type"] == "none"
    assert "select a comparison" in data["interpretation"].lower() or "no comparison" in data["interpretation"].lower()


def test_statistical_tests_display_mode_count(client: TestClient):
    """Test statistical tests work with count display mode."""
    response = client.post(
        "/statistical_tests?level=subject&aggregation_method=mean&comparison_column=response&display_mode=count"
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["results_per_cell_type"]) == 5


def test_statistical_tests_display_mode_percentage(client: TestClient):
    """Test statistical tests work with percentage display mode."""
    response = client.post(
        "/statistical_tests?level=subject&aggregation_method=mean&comparison_column=response&display_mode=percentage"
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["results_per_cell_type"]) == 5


def test_statistical_tests_interpretation_present(client: TestClient):
    """Test that interpretation text is generated."""
    response = client.post(
        "/statistical_tests?level=subject&aggregation_method=mean&comparison_column=response&display_mode=percentage"
    )

    data = response.json()

    assert "interpretation" in data
    assert len(data["interpretation"]) > 0
    assert "cell type" in data["interpretation"].lower()


def test_statistical_tests_warnings_field(client: TestClient):
    """Test that warnings field exists."""
    response = client.post(
        "/statistical_tests?level=subject&aggregation_method=mean&comparison_column=response&display_mode=percentage"
    )

    data = response.json()

    assert "warnings" in data
    assert isinstance(data["warnings"], list)

    # Each result should also have warnings
    for result in data["results_per_cell_type"]:
        assert "warnings" in result
        assert isinstance(result["warnings"], list)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
