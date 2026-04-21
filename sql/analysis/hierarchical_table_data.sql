-- Hierarchical table data query with dynamic level and aggregation
-- This query is parameterized by Python and supports:
-- Levels: project, subject, sample, cell
-- Aggregation methods: first, min, max, median, mode
-- Filters: sex, condition, treatment, response (applied via WHERE clause)

-- Note: This template will be modified by Python code to inject:
-- 1. Dynamic WHERE conditions based on active filters
-- 2. Level-specific GROUP BY and SELECT clauses
-- 3. Aggregation method logic

-- Step 1: Base filtered data
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
    WHERE 1=1
        {{WHERE_FILTERS}}
)

{{AGGREGATION_CTE}}

{{FINAL_SELECT}}
