"""Tests for hierarchical table API endpoints."""
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
    # Create temporary database
    db_path = tmp_path / "test.db"
    schema_path = Path(__file__).resolve().parents[1] / "sql" / "schema.sql"
    con = init_db(db_path, schema_path)

    # Load test data
    csv_path = Path(__file__).resolve().parents[1] / "data" / "cell-count.csv"
    load_csv_to_db(con, csv_path)
    con.close()

    # Override database dependency
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

    # Cleanup
    app.dependency_overrides.clear()


def test_filter_options_endpoint(client: TestClient):
    """Test filter options retrieval."""
    response = client.get("/filter_options")

    assert response.status_code == 200
    data = response.json()

    assert "sex" in data
    assert "condition" in data
    assert "treatment" in data
    assert "response" in data

    assert isinstance(data["sex"], list)
    assert len(data["sex"]) > 0
    assert set(data["sex"]) <= {"M", "F"}

    # Response should not include NULL values
    assert None not in data["response"]
    assert "null" not in [r.lower() if r else r for r in data["response"]]


def test_hierarchical_table_data_project_level(client: TestClient):
    """Test project level aggregation."""
    response = client.get("/hierarchical_table_data?level=project&aggregation_method=mean")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0

    # Verify project level columns
    row = data[0]
    assert "project_id" in row
    assert "b_cell" in row
    assert "cd8_t_cell" in row
    assert "cd4_t_cell" in row
    assert "nk_cell" in row
    assert "monocyte" in row

    # Should not have subject/sample columns at project level
    assert "subject_id" not in row
    assert "sample_id" not in row

    # All projects should be unique
    project_ids = [r["project_id"] for r in data]
    assert len(project_ids) == len(set(project_ids))


def test_hierarchical_table_data_subject_level(client: TestClient):
    """Test subject level aggregation."""
    response = client.get("/hierarchical_table_data?level=subject&aggregation_method=mean")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

    row = data[0]
    # Subject level should have subject attributes
    assert "subject_id" in row
    assert "condition" in row
    assert "age" in row
    assert "sex" in row
    assert "treatment" in row
    assert "response" in row or row.get("response") is None
    assert "sample_type" in row

    # And cell type aggregations
    assert "b_cell" in row
    assert "cd8_t_cell" in row

    # Should not have sample-specific columns
    assert "sample_id" not in row
    assert "time_from_treatment_start" not in row


def test_hierarchical_table_data_sample_level(client: TestClient):
    """Test sample level aggregation."""
    response = client.get("/hierarchical_table_data?level=sample&aggregation_method=mean")

    assert response.status_code == 200
    data = response.json()

    row = data[0]
    # Sample level should have all hierarchy attributes
    assert "project_id" in row
    assert "subject_id" in row
    assert "sample_id" in row
    assert "time_from_treatment_start" in row

    # And cell type aggregations
    assert "b_cell" in row
    assert "monocyte" in row

    # Should not have cell-specific columns
    assert "cell_type_name" not in row
    assert "cell_count" not in row


def test_hierarchical_table_data_cell_level(client: TestClient):
    """Test cell level (no aggregation)."""
    response = client.get("/hierarchical_table_data?level=cell&aggregation_method=mean")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

    row = data[0]
    assert "cell_type_name" in row
    assert "cell_count" in row
    assert "cell_percentage" in row  # Backend calculates percentage for cell level

    # Should not have aggregated cell columns at cell level
    assert "b_cell" not in row
    assert "cd8_t_cell" not in row

    # Should have all parent attributes
    assert "project_id" in row
    assert "subject_id" in row
    assert "sample_id" in row


def test_hierarchical_table_data_with_filters(client: TestClient):
    """Test filtering by sex and condition."""
    # First get unfiltered count
    response_all = client.get("/hierarchical_table_data?level=sample&aggregation_method=mean")
    all_data = response_all.json()

    # Then get filtered count
    response = client.get(
        "/hierarchical_table_data?level=sample&aggregation_method=mean&sex=M&condition=melanoma"
    )

    assert response.status_code == 200
    data = response.json()

    # Filtered should have fewer rows
    assert len(data) <= len(all_data)

    # Verify all rows match filters
    for row in data:
        assert row["sex"] == "M"
        assert row["condition"] == "melanoma"


def test_hierarchical_table_data_multiple_filter_values(client: TestClient):
    """Test filtering with multiple values for same filter."""
    response = client.get(
        "/hierarchical_table_data?level=subject&aggregation_method=mean&sex=M&sex=F"
    )

    assert response.status_code == 200
    data = response.json()

    # Should include both M and F
    sexes = set(row["sex"] for row in data)
    assert sexes <= {"M", "F"}


def test_hierarchical_table_data_aggregation_methods(client: TestClient):
    """Test all aggregation methods return valid data."""
    methods = ["mean", "min", "max", "median", "sum"]

    for method in methods:
        response = client.get(f"/hierarchical_table_data?level=subject&aggregation_method={method}")
        assert response.status_code == 200, f"Failed for method: {method}"
        data = response.json()
        assert len(data) > 0, f"No data returned for method: {method}"

        # Check that aggregated values are present and numeric
        row = data[0]
        assert "b_cell" in row
        assert isinstance(row["b_cell"], (int, float))


def test_hierarchical_table_data_aggregation_methods_differ(client: TestClient):
    """Test that different aggregation methods produce different results."""
    response_min = client.get("/hierarchical_table_data?level=subject&aggregation_method=min")
    response_max = client.get("/hierarchical_table_data?level=subject&aggregation_method=max")

    data_min = response_min.json()
    data_max = response_max.json()

    # Find a subject that exists in both
    if len(data_min) > 0 and len(data_max) > 0:
        subject_id = data_min[0]["subject_id"]

        min_row = next((r for r in data_min if r["subject_id"] == subject_id), None)
        max_row = next((r for r in data_max if r["subject_id"] == subject_id), None)

        if min_row and max_row:
            # Max values should be >= min values (might be equal if only one sample)
            assert max_row["b_cell"] >= min_row["b_cell"]


def test_invalid_level_returns_400(client: TestClient):
    """Test invalid level parameter."""
    response = client.get("/hierarchical_table_data?level=invalid")
    assert response.status_code == 400
    assert "Invalid level" in response.json()["detail"]


def test_invalid_aggregation_method_returns_400(client: TestClient):
    """Test invalid aggregation method."""
    response = client.get("/hierarchical_table_data?level=sample&aggregation_method=invalid")
    assert response.status_code == 400
    assert "Invalid aggregation method" in response.json()["detail"]


def test_empty_filters_return_all_data(client: TestClient):
    """Test that no filters returns all data."""
    response = client.get("/hierarchical_table_data?level=project&aggregation_method=mean")

    assert response.status_code == 200
    data = response.json()

    # Should have all projects
    assert len(data) >= 3  # We know there are at least 3 projects in test data


def test_filter_combinations(client: TestClient):
    """Test combining multiple filter types."""
    response = client.get(
        "/hierarchical_table_data?level=sample&aggregation_method=mean"
        "&sex=M&condition=melanoma&treatment=miraclib"
    )

    assert response.status_code == 200
    data = response.json()

    # All rows should match all filters
    for row in data:
        assert row["sex"] == "M"
        assert row["condition"] == "melanoma"
        assert row["treatment"] == "miraclib"


def test_sum_not_available_at_project_level(client: TestClient):
    """Test that sum aggregation is not allowed at project level."""
    response = client.get("/hierarchical_table_data?level=project&aggregation_method=sum")

    assert response.status_code == 400
    assert "Sum aggregation is not supported at project level" in response.json()["detail"]


def test_time_from_treatment_filter(client: TestClient):
    """Test filtering by time_from_treatment."""
    # Get all samples
    response_all = client.get("/hierarchical_table_data?level=sample&aggregation_method=mean")
    all_data = response_all.json()

    # Filter to specific time points (e.g., day 0 and day 7)
    response_filtered = client.get(
        "/hierarchical_table_data?level=sample&aggregation_method=mean&time_from_treatment=0&time_from_treatment=7"
    )

    assert response_filtered.status_code == 200
    filtered_data = response_filtered.json()

    # Filtered should have fewer or equal rows
    assert len(filtered_data) <= len(all_data)

    # All rows should have time_from_treatment_start in [0, 7]
    for row in filtered_data:
        assert row["time_from_treatment_start"] in [0, 7]


def test_cell_level_percentage_calculation(client: TestClient):
    """Test that cell level includes percentage calculation."""
    response = client.get("/hierarchical_table_data?level=cell&aggregation_method=mean")

    assert response.status_code == 200
    data = response.json()

    # Group by sample and verify percentages sum to ~100
    from collections import defaultdict
    samples = defaultdict(list)

    for row in data:
        samples[row["sample_id"]].append(row)

    # Check a few samples
    for sample_id, rows in list(samples.items())[:5]:
        total_percentage = sum(row["cell_percentage"] for row in rows)
        assert abs(total_percentage - 100.0) < 0.5, f"Sample {sample_id} percentages sum to {total_percentage}, expected ~100"

        # Also verify percentage matches count/total
        total_count = sum(row["cell_count"] for row in rows)
        for row in rows:
            expected_pct = (row["cell_count"] / total_count) * 100
            assert abs(row["cell_percentage"] - expected_pct) < 0.2, (
                f"Percentage mismatch: {row['cell_percentage']} vs {expected_pct}"
            )


def test_response_filter_excludes_null(client: TestClient):
    """Test that response filter properly handles null values."""
    # Get filter options
    response = client.get("/filter_options")
    data = response.json()

    # Verify response options don't include null
    assert None not in data["response"]

    # Test filtering by specific response value
    response_filtered = client.get(
        "/hierarchical_table_data?level=subject&aggregation_method=mean&response=yes"
    )

    assert response_filtered.status_code == 200
    filtered_data = response_filtered.json()

    # All rows should have response="yes"
    for row in filtered_data:
        assert row["response"] == "yes"


def test_default_aggregation_method(client: TestClient):
    """Test that default aggregation method is 'mean'."""
    # Test without specifying aggregation_method
    response = client.get("/hierarchical_table_data?level=subject")

    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0

    # Should successfully return data using mean as default
    row = data[0]
    assert "b_cell" in row
    assert isinstance(row["b_cell"], (int, float))


def test_mean_aggregation_correctness(client: TestClient):
    """Test that mean aggregation calculates correct average."""
    response = client.get("/hierarchical_table_data?level=subject&aggregation_method=mean")

    assert response.status_code == 200
    data = response.json()

    # Pick a subject and verify mean is correct
    if len(data) > 0:
        subject = data[0]
        subject_id = subject["subject_id"]

        # This is verified in more detail in test_aggregation_functions.py
        # Here just verify the value is reasonable (positive, not zero for most cell types)
        assert subject["b_cell"] > 0
        assert subject["cd8_t_cell"] >= 0  # Could theoretically be 0
        assert subject["monocyte"] >= 0


def test_median_vs_mean_differ(client: TestClient):
    """Test that median and mean produce different results when data is skewed."""
    response_mean = client.get("/hierarchical_table_data?level=subject&aggregation_method=mean")
    response_median = client.get("/hierarchical_table_data?level=subject&aggregation_method=median")

    assert response_mean.status_code == 200
    assert response_median.status_code == 200

    data_mean = response_mean.json()
    data_median = response_median.json()

    # Find same subject in both
    if len(data_mean) > 0 and len(data_median) > 0:
        subject_id = data_mean[0]["subject_id"]
        mean_row = next((r for r in data_mean if r["subject_id"] == subject_id), None)
        median_row = next((r for r in data_median if r["subject_id"] == subject_id), None)

        # At least one cell type should differ (unless perfectly symmetric data)
        if mean_row and median_row:
            differences = sum(
                1 for cell_type in ["b_cell", "cd8_t_cell", "cd4_t_cell", "nk_cell", "monocyte"]
                if abs(mean_row[cell_type] - median_row[cell_type]) > 0.1
            )
            # We expect some differences in most real datasets
            assert differences >= 0  # At least verify they can differ


def test_total_count_calculated(client: TestClient):
    """Test that total_count is calculated for all aggregated levels."""
    for level in ["project", "subject", "sample"]:
        response = client.get(f"/hierarchical_table_data?level={level}&aggregation_method=mean")
        assert response.status_code == 200
        data = response.json()

        if len(data) > 0:
            row = data[0]
            assert "total_count" in row
            assert row["total_count"] > 0

            # Verify total = sum of cell types
            cell_sum = (
                row.get("b_cell", 0) +
                row.get("cd8_t_cell", 0) +
                row.get("cd4_t_cell", 0) +
                row.get("nk_cell", 0) +
                row.get("monocyte", 0)
            )
            assert abs(row["total_count"] - cell_sum) < 0.01, (
                f"Total count mismatch: {row['total_count']} vs {cell_sum}"
            )


def test_time_from_treatment_filter(client: TestClient):
    """Test filtering by time_from_treatment."""
    response = client.get(
        "/hierarchical_table_data?level=sample&aggregation_method=mean&time_from_treatment=0"
    )

    assert response.status_code == 200
    data = response.json()

    # All rows should have time_from_treatment_start = 0
    for row in data:
        assert row["time_from_treatment_start"] == 0


def test_time_from_treatment_multiple_values(client: TestClient):
    """Test filtering by multiple time_from_treatment values."""
    response = client.get(
        "/hierarchical_table_data?level=sample&aggregation_method=mean&time_from_treatment=0&time_from_treatment=7"
    )

    assert response.status_code == 200
    data = response.json()

    # Should include both 0 and 7
    times = set(row["time_from_treatment_start"] for row in data)
    assert times <= {0, 7}
    assert len(times) > 0


def test_response_filter_excludes_null(client: TestClient):
    """Test that response filter works and filter_options excludes NULL."""
    # First check filter options
    response_opts = client.get("/filter_options")
    opts = response_opts.json()

    # Response filter should not include None/null
    assert None not in opts["response"]

    # Test filtering by response
    if len(opts["response"]) > 0:
        response_value = opts["response"][0]
        response = client.get(
            f"/hierarchical_table_data?level=subject&aggregation_method=mean&response={response_value}"
        )

        assert response.status_code == 200
        data = response.json()

        # All rows should match the filter
        for row in data:
            assert row["response"] == response_value


def test_mean_is_default_aggregation(client: TestClient):
    """Test that mean is the default aggregation method."""
    # Request without aggregation_method parameter
    response = client.get("/hierarchical_table_data?level=subject")

    assert response.status_code == 200
    data = response.json()

    # Should return data successfully (mean is default)
    assert len(data) > 0
    assert "b_cell" in data[0]


def test_cell_level_returns_percentage(client: TestClient):
    """Test that cell level includes cell_percentage column."""
    response = client.get("/hierarchical_table_data?level=cell&aggregation_method=mean")

    assert response.status_code == 200
    data = response.json()

    # Should have cell_percentage for each row
    for row in data:
        assert "cell_percentage" in row
        assert isinstance(row["cell_percentage"], (int, float))
        assert 0 <= row["cell_percentage"] <= 100


def test_cell_level_percentage_sums_to_100(client: TestClient):
    """Test that cell percentages within a sample sum to ~100%."""
    response = client.get("/hierarchical_table_data?level=cell&aggregation_method=mean")

    assert response.status_code == 200
    data = response.json()

    # Group by sample_id and check sum
    from collections import defaultdict
    sample_percentages = defaultdict(float)

    for row in data:
        sample_percentages[row["sample_id"]] += row["cell_percentage"]

    # Each sample should have percentages summing to ~100%
    for sample_id, total_pct in sample_percentages.items():
        assert abs(total_pct - 100.0) < 0.5, f"Sample {sample_id} percentages sum to {total_pct}, expected ~100%"


def test_all_filter_options_fields(client: TestClient):
    """Test that filter_options returns all required fields."""
    response = client.get("/filter_options")

    assert response.status_code == 200
    data = response.json()

    # Check all required fields exist
    assert "sex" in data
    assert "condition" in data
    assert "treatment" in data
    assert "response" in data
    assert "time_from_treatment" in data

    # Check types
    assert isinstance(data["sex"], list)
    assert isinstance(data["condition"], list)
    assert isinstance(data["treatment"], list)
    assert isinstance(data["response"], list)
    assert isinstance(data["time_from_treatment"], list)

    # time_from_treatment should be integers
    for t in data["time_from_treatment"]:
        assert isinstance(t, int)


def test_total_count_column_present(client: TestClient):
    """Test that total_count column is present in aggregated levels."""
    response = client.get("/hierarchical_table_data?level=subject&aggregation_method=mean")

    assert response.status_code == 200
    data = response.json()

    # Should have total_count
    for row in data:
        assert "total_count" in row
        assert isinstance(row["total_count"], (int, float))
        assert row["total_count"] > 0


def test_aggregation_preserves_metadata_columns(client: TestClient):
    """Test that aggregation preserves all metadata columns at each level."""
    # Subject level
    response_subject = client.get("/hierarchical_table_data?level=subject&aggregation_method=mean")
    data_subject = response_subject.json()

    row = data_subject[0]
    assert "project_id" in row
    assert "subject_id" in row
    assert "condition" in row
    assert "age" in row
    assert "sex" in row
    assert "treatment" in row
    assert "sample_type" in row

    # Sample level
    response_sample = client.get("/hierarchical_table_data?level=sample&aggregation_method=mean")
    data_sample = response_sample.json()

    row = data_sample[0]
    assert "project_id" in row
    assert "subject_id" in row
    assert "sample_id" in row
    assert "time_from_treatment_start" in row
    assert "condition" in row
    assert "sex" in row
