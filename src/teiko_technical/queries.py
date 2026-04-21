from pathlib import Path
import sqlite3

ROOT_DIR = Path(__file__).resolve().parents[2]
SQL_ANALYSIS_DIR = ROOT_DIR / "sql" / "analysis"

def get_sample_cell_type_frequncy(con: sqlite3.Connection) -> list[dict]:
    query = (SQL_ANALYSIS_DIR / "sample_cell_type_frequency.sql").read_text()
    rows = con.execute(query).fetchall()
    return list(map(dict, rows))

def get_frequency_data(con: sqlite3.Connection) -> list[dict]:
    query = (SQL_ANALYSIS_DIR / "frequency_data.sql").read_text()
    rows = con.execute(query).fetchall()
    return list(map(dict, rows))

def get_conditions(con: sqlite3.Connection) -> list[str]:
    query = "SELECT DISTINCT condition FROM subject"
    return list(con.execute(query).fetchall())

def get_treatments(con: sqlite3.Connection) -> list[str]:
    query = "SELECT DISTINCT treatment FROM subject"
    return list(con.execute(query).fetchall())

def get_sex_values(con: sqlite3.Connection) -> list[str]:
    """Get all distinct sex values from the database."""
    query = "SELECT DISTINCT sex FROM subject ORDER BY sex"
    rows = con.execute(query).fetchall()
    return [row[0] for row in rows]

def get_condition_values(con: sqlite3.Connection) -> list[str]:
    """Get all distinct condition values from the database."""
    query = "SELECT DISTINCT condition FROM subject ORDER BY condition"
    rows = con.execute(query).fetchall()
    return [row[0] for row in rows]

def get_treatment_values(con: sqlite3.Connection) -> list[str]:
    """Get all distinct treatment values from the database."""
    query = "SELECT DISTINCT treatment FROM subject ORDER BY treatment"
    rows = con.execute(query).fetchall()
    return [row[0] for row in rows]

def get_response_values(con: sqlite3.Connection) -> list[str]:
    """Get all distinct response values from the database (excluding NULL)."""
    query = "SELECT DISTINCT response FROM subject WHERE response IS NOT NULL ORDER BY response"
    rows = con.execute(query).fetchall()
    return [row[0] for row in rows]

def get_time_from_treatment_values(con: sqlite3.Connection) -> list[int]:
    """Get all distinct time_from_treatment_start values from the database."""
    query = "SELECT DISTINCT time_from_treatment_start FROM sample ORDER BY time_from_treatment_start"
    rows = con.execute(query).fetchall()
    return [row[0] for row in rows]

def get_sample_type_values(con: sqlite3.Connection) -> list[str]:
    """Get all distinct sample_type values from the database."""
    query = "SELECT DISTINCT sample_type FROM subject ORDER BY sample_type"
    rows = con.execute(query).fetchall()
    return [row[0] for row in rows]

def get_hierarchical_table_data(
    con: sqlite3.Connection,
    level: str,
    aggregation_method: str,
    sex_filter: list[str] | None = None,
    condition_filter: list[str] | None = None,
    treatment_filter: list[str] | None = None,
    response_filter: list[str] | None = None,
    sample_type_filter: list[str] | None = None,
    time_from_treatment_filter: list[int] | None = None,
) -> list[dict]:
    """
    Fetch hierarchical table data with dynamic aggregation.

    Args:
        con: Database connection
        level: One of 'project', 'subject', 'sample', 'cell'
        aggregation_method: One of 'first', 'min', 'max', 'median', 'mode', 'sum'
        sex_filter: Optional list of sex values to filter
        condition_filter: Optional list of conditions to filter
        treatment_filter: Optional list of treatments to filter
        response_filter: Optional list of response values to filter
        time_from_treatment_filter: Optional list of time values to filter

    Returns:
        List of dictionaries with hierarchical data
    """
    # Validate parameters
    valid_levels = ['project', 'subject', 'sample', 'cell']
    valid_methods = ['mean', 'median', 'min', 'max', 'sum']

    if level not in valid_levels:
        raise ValueError(f"Invalid level: {level}. Must be one of {valid_levels}")
    if aggregation_method not in valid_methods:
        raise ValueError(f"Invalid aggregation_method: {aggregation_method}. Must be one of {valid_methods}")

    if level == 'project' and aggregation_method == 'sum':
        raise ValueError("Sum aggregation is not supported at project level")

    # Build WHERE clause conditions
    where_conditions = []
    params = []

    if sex_filter:
        placeholders = ','.join('?' * len(sex_filter))
        where_conditions.append(f"su.sex IN ({placeholders})")
        params.extend(sex_filter)

    if condition_filter:
        placeholders = ','.join('?' * len(condition_filter))
        where_conditions.append(f"su.condition IN ({placeholders})")
        params.extend(condition_filter)

    if treatment_filter:
        placeholders = ','.join('?' * len(treatment_filter))
        where_conditions.append(f"su.treatment IN ({placeholders})")
        params.extend(treatment_filter)

    if response_filter:
        placeholders = ','.join('?' * len(response_filter))
        where_conditions.append(f"su.response IN ({placeholders})")
        params.extend(response_filter)

    if sample_type_filter:
        placeholders = ','.join('?' * len(sample_type_filter))
        where_conditions.append(f"su.sample_type IN ({placeholders})")
        params.extend(sample_type_filter)

    if time_from_treatment_filter:
        placeholders = ','.join('?' * len(time_from_treatment_filter))
        where_conditions.append(f"sa.time_from_treatment_start IN ({placeholders})")
        params.extend(time_from_treatment_filter)

    where_clause = " AND " + " AND ".join(where_conditions) if where_conditions else ""

    # Build query based on level and aggregation method
    if level == 'cell':
        # Cell level: no aggregation, just return all cell counts
        # Need to duplicate params because where_clause is used twice in the query
        query = _build_cell_level_query(where_clause)
        query_params = params + params  # Duplicate for the two WHERE clauses
    else:
        # Other levels: apply aggregation
        query = _build_aggregated_query(level, aggregation_method, where_clause)
        query_params = params

    rows = con.execute(query, query_params).fetchall()
    return list(map(dict, rows))

def _build_cell_level_query(where_clause: str) -> str:
    """Build query for cell level (no aggregation) with percentage calculation."""
    return f"""
        WITH filtered_samples AS (
            SELECT DISTINCT sa.sample_id
            FROM sample sa
            JOIN subject su ON sa.subject_id = su.subject_id
            WHERE 1=1{where_clause}
        ),
        sample_totals AS (
            SELECT
                sa.sample_id,
                SUM(scc.cell_count) as total_count
            FROM sample sa
            JOIN sample_cell_count scc ON sa.sample_id = scc.sample_id
            JOIN filtered_samples fs ON sa.sample_id = fs.sample_id
            GROUP BY sa.sample_id
        )
        SELECT DISTINCT
            p.project_id,
            su.subject_id,
            su.condition,
            su.age,
            su.sex,
            su.treatment,
            su.response,
            su.sample_type,
            sa.sample_id,
            sa.time_from_treatment_start,
            ct.cell_type_name,
            scc.cell_count,
            ROUND(CAST(scc.cell_count AS FLOAT) / st.total_count * 100, 1) as cell_percentage,
            st.total_count
        FROM project p
        JOIN subject su ON p.project_id = su.project_id
        JOIN sample sa ON su.subject_id = sa.subject_id
        JOIN sample_cell_count scc ON sa.sample_id = scc.sample_id
        JOIN cell_type ct ON scc.cell_type_id = ct.cell_type_id
        JOIN sample_totals st ON sa.sample_id = st.sample_id
        WHERE 1=1{where_clause}
        ORDER BY p.project_id, su.subject_id, sa.sample_id, ct.cell_type_name
    """

def _build_aggregated_query(level: str, aggregation_method: str, where_clause: str) -> str:
    """Build query for aggregated levels (project, subject, sample)."""
    # Define group by fields for each level
    group_fields = {
        'project': ['p.project_id'],
        'subject': ['p.project_id', 'su.subject_id', 'su.condition', 'su.age', 'su.sex',
                    'su.treatment', 'su.response', 'su.sample_type'],
        'sample': ['p.project_id', 'su.subject_id', 'su.condition', 'su.age', 'su.sex',
                   'su.treatment', 'su.response', 'su.sample_type', 'sa.sample_id',
                   'sa.time_from_treatment_start']
    }

    # Define select fields for each level
    select_fields = {
        'project': 'p.project_id',
        'subject': '''p.project_id, su.subject_id, su.condition, su.age, su.sex,
                      su.treatment, su.response, su.sample_type''',
        'sample': '''p.project_id, su.subject_id, su.condition, su.age, su.sex,
                     su.treatment, su.response, su.sample_type, sa.sample_id,
                     sa.time_from_treatment_start'''
    }

    group_by = ', '.join(group_fields[level])
    select_base = select_fields[level]

    # Build group fields without table aliases for use in CTEs
    group_fields_no_alias = {
        'project': ['project_id'],
        'subject': ['project_id', 'subject_id', 'condition', 'age', 'sex',
                    'treatment', 'response', 'sample_type'],
        'sample': ['project_id', 'subject_id', 'condition', 'age', 'sex',
                   'treatment', 'response', 'sample_type', 'sample_id',
                   'time_from_treatment_start']
    }
    group_by_no_alias = ', '.join(group_fields_no_alias[level])

    # Build aggregation CTE based on method
    if aggregation_method == 'mean':
        agg_expr = 'AVG(cell_count)'
    elif aggregation_method == 'min':
        agg_expr = 'MIN(cell_count)'
    elif aggregation_method == 'max':
        agg_expr = 'MAX(cell_count)'
    elif aggregation_method == 'sum':
        agg_expr = 'SUM(cell_count)'
    elif aggregation_method == 'median':
        # Median calculation using window functions
        agg_cte = f"""
            , ranked_data AS (
                SELECT
                    {group_by_no_alias},
                    cell_type_name,
                    cell_count,
                    ROW_NUMBER() OVER (
                        PARTITION BY {group_by_no_alias}, cell_type_name
                        ORDER BY cell_count
                    ) as rn,
                    COUNT(*) OVER (
                        PARTITION BY {group_by_no_alias}, cell_type_name
                    ) as total_count
                FROM filtered_data
            ),
            median_values AS (
                SELECT
                    {group_by_no_alias},
                    cell_type_name,
                    AVG(cell_count) as median_value
                FROM ranked_data
                WHERE rn IN ((total_count + 1) / 2, (total_count + 2) / 2)
                GROUP BY {group_by_no_alias}, cell_type_name
            )
        """
        return f"""
            WITH filtered_data AS (
                SELECT
                    p.project_id,
                    su.subject_id,
                    su.condition,
                    su.age,
                    su.sex,
                    su.treatment,
                    su.response,
                    su.sample_type,
                    sa.sample_id,
                    sa.time_from_treatment_start,
                    ct.cell_type_name,
                    scc.cell_count
                FROM project p
                JOIN subject su ON p.project_id = su.project_id
                JOIN sample sa ON su.subject_id = sa.subject_id
                JOIN sample_cell_count scc ON sa.sample_id = scc.sample_id
                JOIN cell_type ct ON scc.cell_type_id = ct.cell_type_id
                WHERE 1=1{where_clause}
            )
            {agg_cte}
            , count_data AS (
                SELECT
                    {group_by_no_alias}
                    {','if level in ['project', 'subject'] else ''}
                    {f'COUNT(DISTINCT subject_id) as subject_count,' if level == 'project' else ''}
                    {f'COUNT(DISTINCT sample_id) as sample_count' if level in ['project', 'subject'] else ''}
                FROM filtered_data
                GROUP BY {group_by_no_alias}
            )
            SELECT
                {'median_values.' + group_by_no_alias.replace(', ', ', median_values.')},
                MAX(CASE WHEN cell_type_name = 'b_cell' THEN median_value END) as b_cell,
                MAX(CASE WHEN cell_type_name = 'cd8_t_cell' THEN median_value END) as cd8_t_cell,
                MAX(CASE WHEN cell_type_name = 'cd4_t_cell' THEN median_value END) as cd4_t_cell,
                MAX(CASE WHEN cell_type_name = 'nk_cell' THEN median_value END) as nk_cell,
                MAX(CASE WHEN cell_type_name = 'monocyte' THEN median_value END) as monocyte,
                (
                    COALESCE(MAX(CASE WHEN cell_type_name = 'b_cell' THEN median_value END), 0) +
                    COALESCE(MAX(CASE WHEN cell_type_name = 'cd8_t_cell' THEN median_value END), 0) +
                    COALESCE(MAX(CASE WHEN cell_type_name = 'cd4_t_cell' THEN median_value END), 0) +
                    COALESCE(MAX(CASE WHEN cell_type_name = 'nk_cell' THEN median_value END), 0) +
                    COALESCE(MAX(CASE WHEN cell_type_name = 'monocyte' THEN median_value END), 0)
                ) as total_count
                {f', cd.subject_count, cd.sample_count' if level == 'project' else f', cd.sample_count' if level == 'subject' else ''}
            FROM median_values
            {f'LEFT JOIN count_data cd ON {" AND ".join([f"cd.{field} = median_values.{field}" for field in group_by_no_alias.split(", ")])}' if level in ['project', 'subject'] else ''}
            GROUP BY {'median_values.' + group_by_no_alias.replace(', ', ', median_values.')}{f', cd.subject_count, cd.sample_count' if level == 'project' else f', cd.sample_count' if level == 'subject' else ''}
            ORDER BY {'median_values.' + group_by_no_alias.replace(', ', ', median_values.')}
        """

    # Build count columns based on level
    if level == 'project':
        count_cte = f"""
        , count_data AS (
            SELECT
                project_id,
                COUNT(DISTINCT subject_id) as subject_count,
                COUNT(DISTINCT sample_id) as sample_count
            FROM filtered_data
            GROUP BY project_id
        )
        """
        count_select = ", cd.subject_count, cd.sample_count"
        count_join = "LEFT JOIN count_data cd ON cd.project_id = aggregated_data.project_id"
    elif level == 'subject':
        count_cte = f"""
        , count_data AS (
            SELECT
                project_id,
                subject_id,
                COUNT(DISTINCT sample_id) as sample_count
            FROM filtered_data
            GROUP BY project_id, subject_id
        )
        """
        count_select = ", cd.sample_count"
        count_join = "LEFT JOIN count_data cd ON cd.project_id = aggregated_data.project_id AND cd.subject_id = aggregated_data.subject_id"
    else:
        count_cte = ""
        count_select = ""
        count_join = ""

    # For mean/min/max/sum, use simple aggregation
    return f"""
        WITH filtered_data AS (
            SELECT
                p.project_id,
                su.subject_id,
                su.condition,
                su.age,
                su.sex,
                su.treatment,
                su.response,
                su.sample_type,
                sa.sample_id,
                sa.time_from_treatment_start,
                ct.cell_type_name,
                scc.cell_count
            FROM project p
            JOIN subject su ON p.project_id = su.project_id
            JOIN sample sa ON su.subject_id = sa.subject_id
            JOIN sample_cell_count scc ON sa.sample_id = scc.sample_id
            JOIN cell_type ct ON scc.cell_type_id = ct.cell_type_id
            WHERE 1=1{where_clause}
        ),
        aggregated_data AS (
            SELECT
                {group_by_no_alias},
                cell_type_name,
                {agg_expr} as agg_value
            FROM filtered_data
            GROUP BY {group_by_no_alias}, cell_type_name
        )
        {count_cte}
        SELECT
            aggregated_data.{group_by_no_alias.replace(', ', ', aggregated_data.')},
            MAX(CASE WHEN cell_type_name = 'b_cell' THEN agg_value END) as b_cell,
            MAX(CASE WHEN cell_type_name = 'cd8_t_cell' THEN agg_value END) as cd8_t_cell,
            MAX(CASE WHEN cell_type_name = 'cd4_t_cell' THEN agg_value END) as cd4_t_cell,
            MAX(CASE WHEN cell_type_name = 'nk_cell' THEN agg_value END) as nk_cell,
            MAX(CASE WHEN cell_type_name = 'monocyte' THEN agg_value END) as monocyte,
            (
                COALESCE(MAX(CASE WHEN cell_type_name = 'b_cell' THEN agg_value END), 0) +
                COALESCE(MAX(CASE WHEN cell_type_name = 'cd8_t_cell' THEN agg_value END), 0) +
                COALESCE(MAX(CASE WHEN cell_type_name = 'cd4_t_cell' THEN agg_value END), 0) +
                COALESCE(MAX(CASE WHEN cell_type_name = 'nk_cell' THEN agg_value END), 0) +
                COALESCE(MAX(CASE WHEN cell_type_name = 'monocyte' THEN agg_value END), 0)
            ) as total_count
            {count_select}
        FROM aggregated_data
        {count_join}
        GROUP BY aggregated_data.{group_by_no_alias.replace(', ', ', aggregated_data.')}{', cd.subject_count, cd.sample_count' if level == 'project' else ', cd.sample_count' if level == 'subject' else ''}
        ORDER BY aggregated_data.{group_by_no_alias.replace(', ', ', aggregated_data.')}
    """