WITH totals AS (
    SELECT
        sample_id,
        SUM(cell_count) AS total_count
    FROM sample_cell_count
    GROUP BY sample_id
)
SELECT
    project_id AS project,
    subject_id AS subject,
    condition,
    age,
    sex,
    treatment,
    response,
    sample_id AS sample,
    sample_type,
    time_from_treatment_start,
    cell_type_name AS population,
    cell_count AS count,
    (cell_count * 100.0 / total_count) AS percentage
FROM project
JOIN subject USING (project_id)
JOIN sample USING (subject_id)
JOIN sample_cell_count USING (sample_id)
JOIN cell_type USING (cell_type_id)
JOIN totals USING (sample_id)
ORDER BY project_id, subject_id, sample_id, cell_type_name