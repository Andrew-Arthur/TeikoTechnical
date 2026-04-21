import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "react-router"
import { useMemo, useState, useCallback, memo, useEffect } from "react"
import HierarchicalTable from "../components/HierarchicalTable/HierarchicalTable"
import TableControls from "../components/HierarchicalTable/TableControls"
import ResizablePanes from "../components/HierarchicalTable/ResizablePanes"
import ChartVisualization from "../components/Charts/ChartVisualization"
import { fetchHierarchicalTableData, fetchFilterOptions } from "../api/client"
import {
    getHierarchicalTableStateFromSearchParams,
    updateHierarchicalTableSearchParams,
    buildHierarchicalTableSearchParams,
} from "../services/search-param-service"
import { getDefaultColumnVisibility } from "../components/HierarchicalTable/columnDefaults"
import { getColumnsForLevel } from "../components/HierarchicalTable/columns"
import type { HierarchyLevel, AggregationMethod, HierarchicalTableFilters } from "../types/api"
import type { SortingState, VisibilityState } from "@tanstack/react-table"
import type { ComparisonColumn } from "../types/charts"

// Memoized TableControls wrapper that just passes columns from level
const TableControlsWrapper = memo(function TableControlsWrapper({
    level,
    setLevel,
    aggregationMethod,
    setAggregationMethod,
    filters,
    setFilters,
    filterOptions,
    columnVisibility,
    setColumnVisibility,
    displayMode,
    handleDisplayModeChange,
    comparisonColumn,
    setComparisonColumn,
    availableComparisonColumns,
}: {
    level: HierarchyLevel
    setLevel: (level: HierarchyLevel) => void
    aggregationMethod: AggregationMethod
    setAggregationMethod: (method: AggregationMethod) => void
    filters: HierarchicalTableFilters
    setFilters: (filters: HierarchicalTableFilters) => void
    filterOptions: any
    columnVisibility: VisibilityState
    setColumnVisibility: (updater: VisibilityState | ((old: VisibilityState) => VisibilityState)) => void
    displayMode: "count" | "percentage"
    handleDisplayModeChange: (mode: "count" | "percentage") => void
    comparisonColumn: ComparisonColumn
    setComparisonColumn: (column: ComparisonColumn) => void
    availableComparisonColumns: ComparisonColumn[]
}) {
    const columns = useMemo(() => getColumnsForLevel(level), [level])
    const defaults = useMemo(() => getDefaultColumnVisibility(level), [level])

    // Convert column defs to minimal column objects for visibility control
    const allColumns = useMemo(() => {
        return columns.map((col, idx) => {
            const colAny = col as any
            const id = colAny.accessorKey || colAny.id || `col-${idx}`
            return {
                id: String(id),
                columnDef: col,
                // Merge defaults with delta for visibility check
                getIsVisible: () => {
                    if (columnVisibility[String(id)] !== undefined) {
                        return columnVisibility[String(id)]
                    }
                    return defaults[String(id)] ?? true
                },
                getToggleVisibilityHandler: () => () => {
                    // Get current merged value
                    const currentValue = columnVisibility[String(id)] !== undefined
                        ? columnVisibility[String(id)]
                        : (defaults[String(id)] ?? true)
                    const newValue = !currentValue

                    setColumnVisibility((old: VisibilityState) => {
                        // Only keep columns that differ from defaults
                        const updated: VisibilityState = {}

                        // Copy existing deltas from old state
                        for (const [key, value] of Object.entries(old)) {
                            if (defaults[key] !== value) {
                                updated[key] = value
                            }
                        }

                        // Add/update the toggled column
                        if (defaults[String(id)] !== newValue) {
                            // Differs from default, add to delta
                            updated[String(id)] = newValue
                        } else {
                            // Matches default, remove from delta if present
                            delete updated[String(id)]
                        }

                        return updated
                    })
                },
            }
        })
    }, [columns, columnVisibility, defaults, setColumnVisibility])

    return (
        <TableControls
            level={level}
            setLevel={setLevel}
            aggregationMethod={aggregationMethod}
            setAggregationMethod={setAggregationMethod}
            filters={filters}
            setFilters={setFilters}
            filterOptions={filterOptions}
            allColumns={allColumns as any}
            displayMode={displayMode}
            setDisplayMode={handleDisplayModeChange}
            comparisonColumn={comparisonColumn}
            setComparisonColumn={setComparisonColumn}
            availableComparisonColumns={availableComparisonColumns}
        />
    )
})

export default function HierarchicalTablePage() {
    const [searchParams, setSearchParams] = useSearchParams()

    // Get default column visibility for initial level
    const initialLevel = (searchParams.get("level") as HierarchyLevel) || "sample"
    const defaultColVis = getDefaultColumnVisibility(initialLevel)

    // Parse state from URL
    const {
        level,
        aggregationMethod,
        filters,
        sorting,
        columnVisibility,
        displayMode,
        comparisonColumn: comparisonColumnFromUrl,
    } = getHierarchicalTableStateFromSearchParams(searchParams, defaultColVis)

    // Pane width in local state (not in URL for performance)
    const [paneWidth, setPaneWidth] = useState(60)

    // Clean up URL on mount - remove parameters that match defaults
    useEffect(() => {
        const cleanParams = buildHierarchicalTableSearchParams(new URLSearchParams(), {
            level,
            aggregationMethod,
            filters,
            sorting,
            columnVisibility,
            displayMode,
            comparisonColumn,
        })

        const currentParamsString = searchParams.toString()
        const cleanParamsString = cleanParams.toString()

        if (currentParamsString !== cleanParamsString) {
            setSearchParams(cleanParams, { replace: true })
        }
    }, [])

    // Fetch filter options
    const { data: filterOptions, isLoading: isLoadingFilters } = useQuery({
        queryKey: ["filter_options"],
        queryFn: fetchFilterOptions,
    })

    // Fetch table data
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["hierarchical_table_data", level, aggregationMethod, filters],
        queryFn: () => fetchHierarchicalTableData(level, aggregationMethod, filters),
    })

    // Memoized state setters that update URL
    const setLevel = useCallback((newLevel: HierarchyLevel) => {
        // When level changes, reset column visibility to defaults for new level
        const newDefaultColVis = getDefaultColumnVisibility(newLevel)
        updateHierarchicalTableSearchParams(searchParams, setSearchParams, {
            level: newLevel,
            columnVisibility: newDefaultColVis,
        })
        // Delta encoder will detect it matches defaults and omit from URL
    }, [searchParams, setSearchParams])

    const setAggregationMethod = useCallback((method: AggregationMethod) => {
        updateHierarchicalTableSearchParams(searchParams, setSearchParams, {
            aggregationMethod: method,
        })
    }, [searchParams, setSearchParams])

    const setFilters = useCallback((newFilters: HierarchicalTableFilters) => {
        updateHierarchicalTableSearchParams(searchParams, setSearchParams, {
            filters: newFilters,
        })
    }, [searchParams, setSearchParams])

    const setSorting = useCallback((updater: SortingState | ((old: SortingState) => SortingState)) => {
        const newSorting = typeof updater === "function" ? updater(sorting) : updater
        updateHierarchicalTableSearchParams(searchParams, setSearchParams, {
            sorting: newSorting,
        })
    }, [sorting, searchParams, setSearchParams])

    const setColumnVisibility = useCallback((updater: VisibilityState | ((old: VisibilityState) => VisibilityState)) => {
        const newVisibility = typeof updater === "function" ? updater(columnVisibility) : updater
        updateHierarchicalTableSearchParams(searchParams, setSearchParams, {
            columnVisibility: newVisibility,
        })
    }, [columnVisibility, searchParams, setSearchParams])

    const handleDisplayModeChange = useCallback((mode: "count" | "percentage") => {
        // Display mode changes should NOT create deltas in column visibility
        // The display mode itself controls which columns are visible
        // Just update the displayMode param in the URL
        updateHierarchicalTableSearchParams(searchParams, setSearchParams, {
            displayMode: mode,
        })
    }, [searchParams, setSearchParams])

    // Comparison column for chart grouping (synced with URL)
    const comparisonColumn = (comparisonColumnFromUrl as ComparisonColumn) || "response"

    const setComparisonColumn = useCallback((column: ComparisonColumn) => {
        updateHierarchicalTableSearchParams(searchParams, setSearchParams, {
            comparisonColumn: column,
        })
    }, [searchParams, setSearchParams])

    // Compute available comparison columns based on data
    const availableComparisonColumns = useMemo((): ComparisonColumn[] => {
        if (!data || data.length === 0) return ["none"]

        const isCellLevel = data.length > 0 && data[0].cell_type_name !== undefined

        let columns: ComparisonColumn[] = [
            "none",
            "response",
            "time_from_treatment_start",
            "sex",
            "age",
            "condition",
            "treatment",
            "sample_type",
        ]

        // At cell level, also include sample and subject IDs and cell type
        if (isCellLevel) {
            columns = [...columns, "cell_type_name", "sample_id", "subject_id"]
        }

        // Always include project_id if there are multiple projects
        const uniqueProjects = new Set(data.map(row => row.project_id).filter(val => val != null))
        if (uniqueProjects.size > 1) {
            columns = [...columns, "project_id"]
        }

        // Filter to only show columns with >1 unique value (except "none")
        return columns.filter(col => {
            if (col === "none") return true
            const uniqueValues = new Set(data.map(row => row[col]).filter(val => val != null))
            return uniqueValues.size > 1
        })
    }, [data])

    if (isLoadingFilters) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="text-slate-600">Loading filters...</div>
            </div>
        )
    }

    if (!filterOptions) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="text-red-600">Failed to load filter options</div>
            </div>
        )
    }

    return (
        <div className="h-screen flex flex-col">
            {/* Header */}
            <div className="p-6 bg-white border-b border-slate-200 flex items-center justify-between">
                <h1 className="text-3xl font-semibold text-slate-900">Teiko Technical Dashboard</h1>

                {/* Technical Rubric Shortlinks */}
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-slate-600">Quick Links:</span>
                    <div className="flex items-center gap-2">
                        <a
                            href="/?level=cell&compare=none"
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors"
                        >
                            Part 2
                        </a>
                        <a
                            href="/?sample_type=PBMC&condition=melanoma&treatment=miraclib"
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors"
                        >
                            Part 3a
                        </a>
                        <a
                            href="/?sample_type=PBMC&condition=melanoma&treatment=miraclib&level=subject"
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors"
                        >
                            Part 3b
                        </a>
                        <a
                            href="/?condition=melanoma&treatment=miraclib&sample_type=PBMC&time=0&compare=none"
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors"
                        >
                            Part 4.1
                        </a>
                        <a
                            href="/?condition=melanoma&treatment=miraclib&sample_type=PBMC&time=0&level=project"
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors"
                        >
                            Part 4.2.1
                        </a>
                        <a
                            href="/?condition=melanoma&treatment=miraclib&sample_type=PBMC&time=0&level=subject"
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors"
                        >
                            Part 4.2.2
                        </a>
                        <a
                            href="/?condition=melanoma&treatment=miraclib&sample_type=PBMC&time=0&level=subject&compare=sex"
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors"
                        >
                            Part 4.2.3
                        </a>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="px-6 pt-4">
                <TableControlsWrapper
                    level={level}
                    setLevel={setLevel}
                    aggregationMethod={aggregationMethod}
                    setAggregationMethod={setAggregationMethod}
                    filters={filters}
                    setFilters={setFilters}
                    filterOptions={filterOptions}
                    columnVisibility={columnVisibility}
                    setColumnVisibility={setColumnVisibility}
                    displayMode={displayMode}
                    handleDisplayModeChange={handleDisplayModeChange}
                    comparisonColumn={comparisonColumn}
                    setComparisonColumn={setComparisonColumn}
                    availableComparisonColumns={availableComparisonColumns}
                />
            </div>

            {/* Resizable panes with table */}
            <div className="flex-1 overflow-hidden px-6 pb-6">
                <ResizablePanes
                    leftWidth={paneWidth}
                    onLeftWidthChange={setPaneWidth}
                    leftPane={
                        <div className="h-full border border-slate-200 rounded-lg overflow-hidden">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-slate-600">Loading data...</div>
                                </div>
                            ) : isError ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-red-600">Error: {error?.message}</div>
                                </div>
                            ) : data ? (
                                <HierarchicalTable
                                    data={data}
                                    level={level}
                                    sorting={sorting}
                                    setSorting={setSorting}
                                    columnVisibility={columnVisibility}
                                    setColumnVisibility={setColumnVisibility}
                                    displayMode={displayMode}
                                    comparisonColumn={comparisonColumn}
                                />
                            ) : null}
                        </div>
                    }
                    rightPane={
                        <ChartVisualization
                            data={data || []}
                            comparisonColumn={comparisonColumn}
                            displayMode={displayMode}
                            level={level}
                            aggregationMethod={aggregationMethod}
                            filters={filters}
                        />
                    }
                />
            </div>
        </div>
    )
}
