WITH totals AS (
    SELECT
        sample_id,
        SUM(cell_count) AS total_count
    FROM sample_cell_count
    GROUP BY sample_id
)
SELECT
    sample_id AS sample,
    total_count,
    cell_type_name AS population,
    cell_count AS count,
    (cell_count * 100.0 / total_count) AS percentage
FROM sample
JOIN sample_cell_count USING (sample_id)
JOIN cell_type USING (cell_type_id)
JOIN totals USING (sample_id)
ORDER BY sample_id, cell_type_name