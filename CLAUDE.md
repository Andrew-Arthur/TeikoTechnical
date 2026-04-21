# Backend Development Guide (Python/FastAPI)

This document provides context for AI assistants (Claude) working on the TeikoTechnical backend.

## Project Overview

Cell type analysis tool with hierarchical data exploration. FastAPI backend serves data from SQLite database containing cell count measurements organized as: **Project → Subject → Sample → Cell Type**.

## Architecture

### Tech Stack
- **Framework**: FastAPI (REST API)
- **Database**: SQLite3 with normalized schema
- **Testing**: pytest with TestClient
- **Dependencies**: See `requirements.txt` and `pyproject.toml`

### Core Principles
- **DRY**: Reuse SQL patterns, avoid code duplication
- **Type Safety**: Use Python type hints consistently
- **Security**: Always use parameterized queries (never string interpolation for SQL)
- **Testing**: Write tests for all new endpoints and query functions

## Database Schema

See `sql/schema.sql` for full schema. Key tables:

```
project (project_id PK)
  ↓
subject (subject_id PK, project_id FK, condition, age, sex, treatment, response, sample_type)
  ↓
sample (sample_id PK, subject_id FK, time_from_treatment_start)
  ↓
sample_cell_count (sample_id PK/FK, cell_type_id PK/FK, cell_count)
  ↓
cell_type (cell_type_id PK, cell_type_name UNIQUE)
```

**Fixed cell types**: `b_cell`, `cd8_t_cell`, `cd4_t_cell`, `nk_cell`, `monocyte`

**Indexes**: All foreign keys are indexed for query performance.

## Code Organization

### `api.py` - FastAPI Application
- Defines REST endpoints
- Uses dependency injection for database connections
- CORS configured for localhost:5173 (frontend dev server)
- **Pattern**: Keep endpoint logic thin, delegate to `queries.py`

**Example endpoint:**
```python
@app.get("/endpoint_name")
def endpoint_name(
    param: str = "default",
    con: sqlite3.Connection = Depends(get_con)
):
    data = get_query_function(con, param)
    return data
```

### `queries.py` - Query Functions
- Contains all database query logic
- SQL queries are built dynamically in Python (no separate SQL files for analysis)
- **Pattern**: Return `list[dict]` for consistency
- **Security**: Use parameterized queries with `?` placeholders

**Example query function:**
```python
def get_data(con: sqlite3.Connection, filter_value: str | None = None) -> list[dict]:
    """
    Fetch data with optional filtering.
    
    Args:
        con: Database connection
        filter_value: Optional filter parameter
        
    Returns:
        List of dictionaries with query results
    """
    # Build query with parameterization
    query = "SELECT * FROM table WHERE column = ?"
    params = [filter_value] if filter_value else []
    
    rows = con.execute(query, params).fetchall()
    return list(map(dict, rows))
```

### `statistical_tests.py` - Statistical Analysis
- Contains statistical test functions
- Automatically selects appropriate test based on level and aggregation
- **Mann-Whitney U**: For subject/project level (independent samples)
- **Mixed-Effects Models**: For sample/cell level (repeated measures)
- **FDR Correction**: Applies Benjamini-Hochberg correction for multiple comparisons

## Hierarchical Data System

The hierarchical table API supports 4 levels × 5 aggregation methods:

**Levels**: `project`, `subject`, `sample`, `cell`
**Aggregation Methods**: `mean`, `median`, `min`, `max`, `sum`

### Query Building Strategy

1. **Validation**: Validate level and aggregation_method against whitelists
2. **WHERE Clause**: Build filter conditions dynamically with parameterization
3. **Aggregation CTE**: Apply method-specific aggregation logic
4. **Pivot**: Transform cell_type rows into columns (except cell level)
5. **GROUP BY**: Group by level-specific fields

**Cell Level** (no aggregation):
- Returns one row per cell type per sample
- Columns: all hierarchy fields + `cell_type_name` + `cell_count`

**Aggregated Levels** (project/subject/sample):
- Returns one row per entity at that level
- Columns: hierarchy fields + 5 cell type columns (b_cell, cd8_t_cell, etc.)
- Aggregation applied across child entities

### SQL Aggregation Patterns

**Mode** (most complex):
```sql
WITH value_counts AS (
    SELECT group_fields, cell_type_name, cell_count, COUNT(*) as frequency
    FROM filtered_data
    GROUP BY group_fields, cell_type_name, cell_count
),
mode_values AS (
    SELECT group_fields, cell_type_name, cell_count as mode_value
    FROM (
        SELECT *, ROW_NUMBER() OVER (
            PARTITION BY group_fields, cell_type_name
            ORDER BY frequency DESC, cell_count DESC
        ) as rn
        FROM value_counts
    )
    WHERE rn = 1
)
```

**Median**:
```sql
WITH ranked_data AS (
    SELECT *, 
        ROW_NUMBER() OVER (PARTITION BY group_fields, cell_type_name ORDER BY cell_count) as rn,
        COUNT(*) OVER (PARTITION BY group_fields, cell_type_name) as total_count
    FROM filtered_data
),
median_values AS (
    SELECT group_fields, cell_type_name, AVG(cell_count) as median_value
    FROM ranked_data
    WHERE rn IN ((total_count + 1) / 2, (total_count + 2) / 2)
    GROUP BY group_fields, cell_type_name
)
```

**Pivot Pattern** (used in all aggregated queries):
```sql
SELECT
    group_fields,
    MAX(CASE WHEN cell_type_name = 'b_cell' THEN agg_value END) as b_cell,
    MAX(CASE WHEN cell_type_name = 'cd8_t_cell' THEN agg_value END) as cd8_t_cell,
    MAX(CASE WHEN cell_type_name = 'cd4_t_cell' THEN agg_value END) as cd4_t_cell,
    MAX(CASE WHEN cell_type_name = 'nk_cell' THEN agg_value END) as nk_cell,
    MAX(CASE WHEN cell_type_name = 'monocyte' THEN agg_value END) as monocyte
FROM aggregated_data
GROUP BY group_fields
```

## Testing

### Test Structure
- **Fixtures**: Use `tmp_path` for isolated test databases
- **Dependency Override**: Override `get_con` to use test database
- **TestClient**: FastAPI's TestClient for endpoint testing

**Example test:**
```python
@pytest.fixture
def client(tmp_path: Path):
    db_path = tmp_path / "test.db"
    schema_path = Path(__file__).resolve().parents[1] / "sql" / "schema.sql"
    con = init_db(db_path, schema_path)
    
    # Load test data
    csv_path = Path(__file__).resolve().parents[1] / "data" / "cell-count.csv"
    load_csv_to_db(con, csv_path)
    con.close()
    
    # Override dependency
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

def test_endpoint(client: TestClient):
    response = client.get("/endpoint?param=value")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # More assertions...
```

### Running Tests
```bash
pytest tests/test_hierarchical_api.py -v    # Run hierarchical tests
pytest tests/ -v                             # Run all tests
pytest tests/ -k "test_filter" -v           # Run specific tests
```

## Common Tasks

### Adding a New Endpoint

1. **Create query function** in `queries.py`:
```python
def get_new_data(con: sqlite3.Connection, filter_param: str | None = None) -> list[dict]:
    """Docstring explaining what this returns."""
    query = "SELECT ... FROM ... WHERE ..."
    # Implementation
    return list(map(dict, rows))
```

2. **Add endpoint** in `api.py`:
```python
@app.get("/new_endpoint")
def new_endpoint(
    filter_param: str | None = Query(None),
    con: sqlite3.Connection = Depends(get_con)
):
    """Docstring explaining endpoint purpose."""
    return get_new_data(con, filter_param)
```

3. **Write tests** in `tests/test_api.py`:
```python
def test_new_endpoint(client: TestClient):
    response = client.get("/new_endpoint?filter_param=value")
    assert response.status_code == 200
    # More assertions
```

### Adding a New Aggregation Method

1. Update `valid_methods` whitelist in `get_hierarchical_table_data()`
2. Add case in `_build_aggregated_query()` for new method
3. Implement SQL aggregation logic (use CTEs)
4. Add tests in `test_hierarchical_api.py`

### Modifying the Schema

⚠️ **Caution**: Schema changes affect existing data.

1. Update `sql/schema.sql`
2. Update `load_csv_to_db.py` if CSV mapping changes
3. Update query functions that reference affected tables
4. Update tests to reflect schema changes
5. Document migration strategy if needed

## Performance Considerations

- **Indexes**: All foreign keys are indexed; add indexes for frequently filtered columns
- **Query Optimization**: Use `EXPLAIN QUERY PLAN` to analyze slow queries
- **CTE vs Subquery**: CTEs improve readability; SQLite optimizes both similarly
- **Row Counts**: Cell level returns ~50K rows (10K samples × 5 cell types); consider pagination if dataset grows significantly

## Security

- **SQL Injection Prevention**: Always use parameterized queries
- **Validation**: Validate all enum-like inputs (level, aggregation_method) against whitelists
- **CORS**: Only allow localhost origins in development; configure properly for production
- **No Authentication**: Current implementation has no auth; add if exposing publicly

## Development Workflow

1. **Start server**: `python -m uvicorn teiko_technical.api:app --reload --port 8000`
2. **Run tests**: `pytest tests/ -v`
3. **Test endpoints**: Use curl or browser: `curl http://127.0.0.1:8000/endpoint`
4. **Check logs**: Server logs show requests and errors

## Debugging Tips

- **Database Inspection**: Use `sqlite3 data.db` CLI to inspect tables
- **Query Debugging**: Print generated SQL before execution
- **Test Isolation**: Tests use temporary databases; won't affect `data.db`
- **CORS Issues**: Check browser console; ensure origins match middleware config

## Dependencies

Install with: `pip install -r requirements.txt`

- `fastapi`: Web framework
- `uvicorn`: ASGI server
- `httpx`: HTTP client (for TestClient)
- `pytest`: Testing framework

## Future Enhancements

Potential improvements to consider:
- Pagination for large result sets
- Caching layer (Redis) for expensive aggregations
- Background tasks for long-running queries
- WebSocket support for real-time updates
- Authentication/authorization
- Rate limiting
- Request validation with Pydantic models
- API versioning (/v1/endpoint)
