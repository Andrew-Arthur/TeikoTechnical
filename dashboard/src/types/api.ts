// Hierarchical table types
export type HierarchyLevel = "project" | "subject" | "sample" | "cell"
export type AggregationMethod = "mean" | "median" | "min" | "max" | "sum"

export type HierarchicalTableRow = {
    // All levels have these
    project_id: string

    // Subject level and below
    subject_id?: string
    condition?: string
    age?: number
    sex?: string
    treatment?: string
    response?: string | null
    sample_type?: string

    // Sample level and below
    sample_id?: string
    time_from_treatment_start?: number

    // Cell level only
    cell_type_name?: string
    cell_count?: number
    cell_percentage?: number

    // Aggregated cell type columns (all levels except cell)
    b_cell?: number
    cd8_t_cell?: number
    cd4_t_cell?: number
    nk_cell?: number
    monocyte?: number

    // Total count (all levels)
    total_count?: number

    // Count of aggregated records
    subject_count?: number
    sample_count?: number
}

export type FilterOptions = {
    sex: string[]
    condition: string[]
    treatment: string[]
    response: string[]
    sample_type: string[]
    time_from_treatment: number[]
}

export type HierarchicalTableFilters = {
    sex: string[]
    condition: string[]
    treatment: string[]
    response: string[]
    sample_type: string[]
    time_from_treatment: number[]
}

// Statistical analysis types
export type StatisticalTestResult = {
    cell_type: string
    test_name: string
    test_statistic: number
    p_value: number
    adjusted_p_value: number
    is_significant: boolean
    effect_size: number | null
    effect_size_interpretation: "small" | "medium" | "large" | null
    group_sample_sizes: Record<string, number>
    warnings: string[]
}

export type StatisticalAnalysisResult = {
    results_per_cell_type: StatisticalTestResult[]
    comparison_column: string
    groups: string[]
    test_type: string
    test_display_name: string
    correction_method: string
    alpha: number
    fdr_threshold: number
    total_comparisons: number
    interpretation: string
    warnings: string[]
}
