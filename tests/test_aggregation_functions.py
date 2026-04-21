"""
Test aggregation functions for hierarchical table data.
Verifies that sum, mean, median, mode, min, max work correctly.
"""
import pytest
import sqlite3
from pathlib import Path
from teiko_technical.queries import get_hierarchical_table_data
from teiko_technical.init_db import init_db
from teiko_technical.load_csv_to_db import load_csv_to_db


@pytest.fixture
def test_db(tmp_path: Path):
    """Create test database with sample data."""
    db_path = tmp_path / "test.db"
    schema_path = Path(__file__).resolve().parents[1] / "sql" / "schema.sql"

    con = init_db(db_path, schema_path)

    csv_path = Path(__file__).resolve().parents[1] / "data" / "cell-count.csv"
    load_csv_to_db(con, csv_path)
    con.close()

    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row

    yield con

    con.close()


def test_sum_aggregation_at_subject_level(test_db: sqlite3.Connection):
    """
    Test that sum aggregation works correctly at subject level.

    Each subject has 3 samples (at days 0, 7, 14).
    Sum should be 3x the mean of those 3 samples.
    """
    sum_data = get_hierarchical_table_data(test_db, "subject", "sum")
    median_data = get_hierarchical_table_data(test_db, "subject", "median")

    assert len(sum_data) > 0, "Should have subject-level data"
    assert len(sum_data) == len(median_data), "Should have same number of subjects"

    for sum_row, median_row in zip(sum_data, median_data):
        assert sum_row["subject_id"] == median_row["subject_id"], "Subject IDs should match"

        for cell_type in ["b_cell", "cd8_t_cell", "cd4_t_cell", "nk_cell", "monocyte"]:
            sum_val = sum_row[cell_type]
            median_val = median_row[cell_type]

            raw_samples = test_db.execute("""
                SELECT scc.cell_count
                FROM sample_cell_count scc
                JOIN sample sa ON scc.sample_id = sa.sample_id
                JOIN cell_type ct ON scc.cell_type_id = ct.cell_type_id
                WHERE sa.subject_id = ? AND ct.cell_type_name = ?
            """, (sum_row["subject_id"], cell_type)).fetchall()

            raw_values = [row[0] for row in raw_samples]
            expected_sum = sum(raw_values)
            expected_mean = sum(raw_values) / len(raw_values)

            assert sum_val == expected_sum, (
                f"Subject {sum_row['subject_id']}, {cell_type}: "
                f"sum={sum_val} should equal {expected_sum} (sum of {raw_values})"
            )

            assert abs(sum_val - (expected_mean * len(raw_values))) < 0.01, (
                f"Subject {sum_row['subject_id']}, {cell_type}: "
                f"sum={sum_val} should be ~{len(raw_values)}x mean={expected_mean}"
            )


def test_min_max_aggregation(test_db: sqlite3.Connection):
    """Test that min/max return actual min/max values."""
    min_data = get_hierarchical_table_data(test_db, "subject", "min")
    max_data = get_hierarchical_table_data(test_db, "subject", "max")

    for min_row, max_row in zip(min_data, max_data):
        assert min_row["subject_id"] == max_row["subject_id"]

        for cell_type in ["b_cell", "cd8_t_cell", "cd4_t_cell", "nk_cell", "monocyte"]:
            raw_samples = test_db.execute("""
                SELECT scc.cell_count
                FROM sample_cell_count scc
                JOIN sample sa ON scc.sample_id = sa.sample_id
                JOIN cell_type ct ON scc.cell_type_id = ct.cell_type_id
                WHERE sa.subject_id = ? AND ct.cell_type_name = ?
            """, (min_row["subject_id"], cell_type)).fetchall()

            raw_values = [row[0] for row in raw_samples]

            assert min_row[cell_type] == min(raw_values), (
                f"Min should be {min(raw_values)}, got {min_row[cell_type]}"
            )
            assert max_row[cell_type] == max(raw_values), (
                f"Max should be {max(raw_values)}, got {max_row[cell_type]}"
            )


def test_median_aggregation(test_db: sqlite3.Connection):
    """Test that median returns correct middle value."""
    median_data = get_hierarchical_table_data(test_db, "subject", "median")

    subject = median_data[0]

    for cell_type in ["b_cell", "cd8_t_cell", "cd4_t_cell", "nk_cell", "monocyte"]:
        raw_samples = test_db.execute("""
            SELECT scc.cell_count
            FROM sample_cell_count scc
            JOIN sample sa ON scc.sample_id = sa.sample_id
            JOIN cell_type ct ON scc.cell_type_id = ct.cell_type_id
            WHERE sa.subject_id = ? AND ct.cell_type_name = ?
            ORDER BY scc.cell_count
        """, (subject["subject_id"], cell_type)).fetchall()

        raw_values = sorted([row[0] for row in raw_samples])
        n = len(raw_values)

        if n % 2 == 0:
            expected_median = (raw_values[n//2 - 1] + raw_values[n//2]) / 2
        else:
            expected_median = raw_values[n//2]

        assert subject[cell_type] == expected_median, (
            f"Median of {raw_values} should be {expected_median}, got {subject[cell_type]}"
        )


def test_mean_aggregation(test_db: sqlite3.Connection):
    """Test that mean returns correct average value."""
    mean_data = get_hierarchical_table_data(test_db, "subject", "mean")

    subject = mean_data[0]

    for cell_type in ["b_cell", "cd8_t_cell", "cd4_t_cell", "nk_cell", "monocyte"]:
        raw_samples = test_db.execute("""
            SELECT scc.cell_count
            FROM sample_cell_count scc
            JOIN sample sa ON scc.sample_id = sa.sample_id
            JOIN cell_type ct ON scc.cell_type_id = ct.cell_type_id
            WHERE sa.subject_id = ? AND ct.cell_type_name = ?
        """, (subject["subject_id"], cell_type)).fetchall()

        raw_values = [row[0] for row in raw_samples]
        expected_mean = sum(raw_values) / len(raw_values)

        assert abs(subject[cell_type] - expected_mean) < 0.01, (
            f"Mean of {raw_values} should be {expected_mean}, got {subject[cell_type]}"
        )


def test_aggregation_across_all_methods(test_db: sqlite3.Connection):
    """Test all aggregation methods return data."""
    methods = ['mean', 'min', 'max', 'median', 'sum']

    for method in methods:
        data = get_hierarchical_table_data(test_db, "subject", method)
        assert len(data) > 0, f"Method '{method}' should return data"
        assert all(cell_type in data[0] for cell_type in ["b_cell", "cd8_t_cell", "cd4_t_cell", "nk_cell", "monocyte"]), (
            f"Method '{method}' should return all cell types"
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
