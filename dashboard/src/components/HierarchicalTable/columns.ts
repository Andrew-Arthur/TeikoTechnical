import type { ColumnDef } from "@tanstack/react-table"
import type { HierarchicalTableRow, HierarchyLevel } from "../../types/api"

/**
 * Generate column definitions based on hierarchy level
 * All columns are always generated - visibility is controlled separately
 */
export function getColumnsForLevel(
    level: HierarchyLevel
): ColumnDef<HierarchicalTableRow>[] {
    const baseColumns: ColumnDef<HierarchicalTableRow>[] = []

    // All levels have project_id
    baseColumns.push({
        accessorKey: "project_id",
        header: "Project",
        cell: (info) => info.getValue(),
    })

    if (level === "subject" || level === "sample" || level === "cell") {
        // Subject level and below
        baseColumns.push(
            {
                accessorKey: "subject_id",
                header: "Subject",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "condition",
                header: "Condition",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "age",
                header: "Age",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "sex",
                header: "Sex",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "treatment",
                header: "Treatment",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "response",
                header: "Response",
                cell: (info) => {
                    const val = info.getValue()
                    return val === null ? "N/A" : String(val)
                },
            },
            {
                accessorKey: "sample_type",
                header: "Sample Type",
                cell: (info) => info.getValue(),
            }
        )
    }

    if (level === "sample" || level === "cell") {
        // Sample level and below
        baseColumns.push(
            {
                accessorKey: "sample_id",
                header: "Sample",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "time_from_treatment_start",
                header: "Time from Treatment",
                cell: (info) => info.getValue(),
            }
        )
    }

    if (level === "cell") {
        // Cell level: always generate all columns
        baseColumns.push(
            {
                accessorKey: "cell_type_name",
                header: "Cell Type",
                cell: (info) => info.getValue(),
            },
            {
                accessorKey: "total_count",
                header: "Total Count",
                cell: (info) => {
                    const val = info.getValue() as number
                    return val?.toLocaleString()
                },
            },
            {
                accessorKey: "cell_count",
                header: "Cell Count",
                cell: (info) => {
                    const val = info.getValue() as number
                    return val?.toLocaleString()
                },
            },
            {
                accessorKey: "cell_percentage",
                header: "Percentage",
                cell: (info) => {
                    const val = info.getValue() as number
                    return val !== undefined && val !== null ? `${val}%` : '0.0%'
                },
            }
        )
    } else {
        // Aggregated levels: always generate all count and percentage columns

        // Total count column (first)
        baseColumns.push({
            accessorKey: "total_count",
            header: "Total Count",
            cell: (info) => {
                const val = info.getValue() as number
                return val?.toLocaleString()
            },
        })

        // Aggregation count columns (project and subject levels)
        if (level === "project") {
            baseColumns.push({
                accessorKey: "subject_count",
                header: "# Subjects",
                cell: (info) => {
                    const val = info.getValue() as number
                    return val?.toLocaleString()
                },
            })
            baseColumns.push({
                accessorKey: "sample_count",
                header: "# Samples",
                cell: (info) => {
                    const val = info.getValue() as number
                    return val?.toLocaleString()
                },
            })
        } else if (level === "subject") {
            baseColumns.push({
                accessorKey: "sample_count",
                header: "# Samples",
                cell: (info) => {
                    const val = info.getValue() as number
                    return val?.toLocaleString()
                },
            })
        }

        const cellTypes = [
            { key: "b_cell", label: "B Cell" },
            { key: "cd8_t_cell", label: "CD8 T Cell" },
            { key: "cd4_t_cell", label: "CD4 T Cell" },
            { key: "nk_cell", label: "NK Cell" },
            { key: "monocyte", label: "Monocyte" },
        ]

        cellTypes.forEach(({ key, label }) => {
            // Count column
            baseColumns.push({
                accessorKey: key,
                header: label,
                cell: (info) => {
                    const val = info.getValue() as number | undefined
                    return val !== undefined ? val.toLocaleString() : ""
                },
            })
            // Percentage column
            baseColumns.push({
                accessorKey: `${key}_pct`,
                header: `${label} %`,
                cell: (info) => {
                    const row = info.row.original
                    const val = row[key as keyof HierarchicalTableRow] as number | undefined
                    if (val !== undefined && row.total_count) {
                        return `${((val / row.total_count) * 100).toFixed(1)}%`
                    }
                    return "0.0%"
                },
            })
        })
    }

    return baseColumns
}
