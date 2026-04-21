export type ComparisonColumn = "none" | "response" | "time_from_treatment_start" | "sex" | "condition" | "treatment" | "sample_type" | "age" | "project_id" | "subject_id" | "sample_id" | "cell_type_name"

export type GroupStatistics = {
    groupName: string
    rowCount: number
    cellStats: {
        b_cell: CellTypeStats
        cd8_t_cell: CellTypeStats
        cd4_t_cell: CellTypeStats
        nk_cell: CellTypeStats
        monocyte: CellTypeStats
    }
}

export type CellTypeStats = {
    mean: number
    median: number
    stdDev: number
    min: number
    max: number
    q1: number
    q3: number
}

export type ChartData = {
    overallStats: GroupStatistics
    groupedStats: GroupStatistics[]
}
