import type { HierarchicalTableRow } from "../types/api"
import type { ComparisonColumn, GroupStatistics, CellTypeStats, ChartData } from "../types/charts"

const CELL_TYPES = ["b_cell", "cd8_t_cell", "cd4_t_cell", "nk_cell", "monocyte"] as const

export function calculateStats(values: number[]): CellTypeStats {
    if (values.length === 0) {
        return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, q1: 0, q3: 0 }
    }

    const sorted = [...values].sort((a, b) => a - b)
    const n = sorted.length

    const mean = values.reduce((sum, val) => sum + val, 0) / n
    const median = n % 2 === 0
        ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
        : sorted[Math.floor(n / 2)]

    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n
    const stdDev = Math.sqrt(variance)

    const q1 = sorted[Math.floor(n * 0.25)]
    const q3 = sorted[Math.floor(n * 0.75)]

    return {
        mean,
        median,
        stdDev,
        min: sorted[0],
        max: sorted[n - 1],
        q1,
        q3
    }
}

export function processChartData(
    data: HierarchicalTableRow[],
    comparisonColumn: ComparisonColumn,
    displayMode: "count" | "percentage"
): ChartData {
    // Calculate overall statistics
    const overallStats = calculateGroupStats("Overall", data, displayMode)

    // If no comparison, return only overall stats
    if (comparisonColumn === "none") {
        return { overallStats, groupedStats: [] }
    }

    // Group data by comparison column value
    const groups = new Map<string, HierarchicalTableRow[]>()

    data.forEach(row => {
        const groupValue = String(row[comparisonColumn] ?? "Unknown")
        if (!groups.has(groupValue)) {
            groups.set(groupValue, [])
        }
        groups.get(groupValue)!.push(row)
    })

    // Calculate statistics for each group
    const groupedStats: GroupStatistics[] = Array.from(groups.entries()).map(([groupName, rows]) =>
        calculateGroupStats(groupName, rows, displayMode)
    )

    return { overallStats, groupedStats }
}

function calculateGroupStats(
    groupName: string,
    rows: HierarchicalTableRow[],
    displayMode: "count" | "percentage"
): GroupStatistics {
    const cellStats: any = {}

    // Check if we're at cell level
    const isCellLevel = rows.length > 0 && rows[0].cell_type_name !== undefined

    CELL_TYPES.forEach(cellType => {
        // Extract values based on display mode
        let values: number[]

        if (isCellLevel) {
            // At cell level: filter by cell_type_name
            const cellTypeRows = rows.filter(row => row.cell_type_name === cellType)
            values = displayMode === "percentage"
                ? cellTypeRows.map(row => row.cell_percentage as number).filter(v => v != null)
                : cellTypeRows.map(row => row.cell_count as number).filter(v => v != null)
        } else {
            // Aggregated levels
            if (displayMode === "percentage") {
                // Calculate percentage from counts
                values = rows
                    .filter(row => row[cellType] != null)
                    .map(row => {
                        const cellValue = (row[cellType] as number) || 0
                        const total = CELL_TYPES.reduce((sum, ct) => sum + ((row[ct] as number) || 0), 0)
                        return total > 0 ? (cellValue / total) * 100 : 0
                    })
            } else {
                // Use count columns
                values = rows
                    .map(row => row[cellType] as number)
                    .filter(val => val != null && !isNaN(val))
            }
        }

        cellStats[cellType] = calculateStats(values)
    })

    return {
        groupName,
        rowCount: rows.length,
        cellStats
    }
}

export function getGroupColors(groupCount: number): string[] {
    const colors = [
        '#1f77b4',
        '#ff7f0e',
        '#2ca02c',
        '#d62728',
        '#9467bd',
        '#8c564b',
        '#e377c2',
        '#7f7f7f',
        '#bcbd22',
        '#17becf'
    ]
    return colors.slice(0, groupCount)
}

export function getGroupColor(groupName: string, allGroups: string[]): string {
    const index = allGroups.indexOf(groupName)
    const colors = getGroupColors(allGroups.length)
    return colors[index] || colors[0]
}

export function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
