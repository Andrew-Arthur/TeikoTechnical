from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import sqlite3
from teiko_technical.queries import (
    get_hierarchical_table_data, get_sex_values, get_condition_values,
    get_treatment_values, get_response_values, get_time_from_treatment_values,
    get_sample_type_values
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=False,  # Must be False when using wildcard
    allow_methods=["*"],
    allow_headers=["*"],
)

ROOT_DIR = Path(__file__).resolve().parents[2]
DB_PATH = ROOT_DIR / "data.db"


def get_con():
    con = sqlite3.connect(DB_PATH, check_same_thread=False)
    con.row_factory = sqlite3.Row
    try:
        yield con
    finally:
        con.close()


@app.get("/hierarchical_table_data")
def hierarchical_table_data(
    level: str = "sample",
    aggregation_method: str = "mean",
    sex: list[str] | None = Query(None),
    condition: list[str] | None = Query(None),
    treatment: list[str] | None = Query(None),
    response: list[str] | None = Query(None),
    sample_type: list[str] | None = Query(None),
    time_from_treatment: list[int] | None = Query(None),
    con: sqlite3.Connection = Depends(get_con),
):
    """
    Get hierarchical table data with filters and aggregation.

    Query params:
        level: project | subject | sample | cell (default: sample)
        aggregation_method: mean | median | min | max | sum (default: mean)
        sex: Multi-select filter
        condition: Multi-select filter
        treatment: Multi-select filter
        response: Multi-select filter
        sample_type: Multi-select filter
        time_from_treatment: Multi-select filter for time values
    """
    # Validate level
    if level not in ["project", "subject", "sample", "cell"]:
        raise HTTPException(status_code=400, detail=f"Invalid level: {level}")

    # Validate aggregation_method
    if aggregation_method not in ["mean", "median", "min", "max", "sum"]:
        raise HTTPException(
            status_code=400, detail=f"Invalid aggregation method: {aggregation_method}")

    try:
        data = get_hierarchical_table_data(
            con, level, aggregation_method, sex, condition, treatment, response, sample_type, time_from_treatment
        )
        return data
    except ValueError as e:
        # ValueError from validation logic should return 400
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/filter_options")
def filter_options(con: sqlite3.Connection = Depends(get_con)):
    """Get all available filter values for dropdowns."""
    return {
        "sex": get_sex_values(con),
        "condition": get_condition_values(con),
        "treatment": get_treatment_values(con),
        "response": get_response_values(con),
        "sample_type": get_sample_type_values(con),
        "time_from_treatment": get_time_from_treatment_values(con),
    }


@app.post("/statistical_tests")
def statistical_tests(
    level: str,
    comparison_column: str = "response",
    display_mode: str = "percentage",
    aggregation_method: str | None = None,
    sex: list[str] | None = Query(None),
    condition: list[str] | None = Query(None),
    treatment: list[str] | None = Query(None),
    response: list[str] | None = Query(None),
    sample_type: list[str] | None = Query(None),
    time_from_treatment: list[int] | None = Query(None),
    con: sqlite3.Connection = Depends(get_con)
):
    """
    Perform statistical tests comparing cell frequencies between groups.

    Returns statistical test results for all 5 cell types with FDR correction.
    """
    from teiko_technical.statistical_tests import perform_statistical_analysis
    from dataclasses import asdict

    # Cell level doesn't use aggregation for data fetching, but the query function requires it
    # Use a dummy value that won't be used
    fetch_agg_method = aggregation_method if aggregation_method else "mean"

    # Fetch hierarchical table data (reuse existing query)
    data = get_hierarchical_table_data(
        con, level, fetch_agg_method, sex, condition, treatment, response, sample_type, time_from_treatment
    )

    # Convert to list of dicts
    data_dicts = [dict(row) for row in data]

    # Sample and cell levels should NOT use aggregation for statistical tests (repeated measures)
    # Pass None to statistical_tests so it uses mixed-effects model
    statistical_agg_method = None if level in [
        'sample', 'cell'] else aggregation_method

    # Perform analysis
    result = perform_statistical_analysis(
        data_dicts,
        comparison_column,
        level,
        statistical_agg_method,
        display_mode
    )

    # Convert dataclasses to dict for JSON response
    return asdict(result)
