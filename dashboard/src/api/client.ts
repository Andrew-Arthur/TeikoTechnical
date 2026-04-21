import type {
    HierarchicalTableRow,
    HierarchyLevel,
    AggregationMethod,
    HierarchicalTableFilters,
    FilterOptions,
    StatisticalAnalysisResult
} from "../types/api"

export async function fetchHierarchicalTableData(
    level: HierarchyLevel,
    aggregationMethod: AggregationMethod,
    filters: HierarchicalTableFilters
): Promise<HierarchicalTableRow[]> {
    const params = new URLSearchParams({
        level,
        aggregation_method: aggregationMethod,
    })

    filters.sex.forEach(v => params.append("sex", v))
    filters.condition.forEach(v => params.append("condition", v))
    filters.treatment.forEach(v => params.append("treatment", v))
    filters.response.forEach(v => params.append("response", v))
    filters.sample_type.forEach(v => params.append("sample_type", v))
    filters.time_from_treatment.forEach(v => params.append("time_from_treatment", String(v)))

    const response = await fetch(`/hierarchical_table_data?${params}`)
    if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
    }
    return response.json()
}

export async function fetchFilterOptions(): Promise<FilterOptions> {
    const response = await fetch(`/filter_options`)
    if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
    }
    return response.json()
}

export async function fetchStatisticalTests(
    level: HierarchyLevel,
    aggregationMethod: AggregationMethod | null,
    comparisonColumn: string,
    displayMode: "count" | "percentage",
    filters: HierarchicalTableFilters
): Promise<StatisticalAnalysisResult> {
    const params = new URLSearchParams({
        level,
        comparison_column: comparisonColumn,
        display_mode: displayMode,
    })

    if (aggregationMethod) {
        params.append("aggregation_method", aggregationMethod)
    }

    filters.sex.forEach(v => params.append("sex", v))
    filters.condition.forEach(v => params.append("condition", v))
    filters.treatment.forEach(v => params.append("treatment", v))
    filters.response.forEach(v => params.append("response", v))
    filters.sample_type.forEach(v => params.append("sample_type", v))
    filters.time_from_treatment.forEach(v => params.append("time_from_treatment", String(v)))

    const response = await fetch(`/statistical_tests?${params}`, {
        method: "POST",
    })

    if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
    }

    return response.json()
}
