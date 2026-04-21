import type { MRT_ColumnFiltersState, MRT_SortingState } from "material-react-table"
import type { SetURLSearchParams } from "react-router"
import type { HierarchyLevel, AggregationMethod, HierarchicalTableFilters } from "../types/api"
import type { SortingState, VisibilityState } from "@tanstack/react-table"
import { getDefaultColumnVisibility } from "../components/HierarchicalTable/columnDefaults"

export type SearchParamTableState = {
    globalFilter: string
    sorting: MRT_SortingState
    columnFilters: MRT_ColumnFiltersState
}

export type SearchParamTableUpdates = {
    globalFilter?: string
    sorting?: MRT_SortingState
    columnFilters?: MRT_ColumnFiltersState
}

const PARAMS = {
    globalFilter: "search",
    sorting: "sort",
    columnFilters: "filters",
} as const

// Hierarchical table params
export const HIERARCHICAL_PARAMS = {
    level: "level",
    aggregationMethod: "agg",
    filterSex: "sex",
    filterCondition: "condition",
    filterTreatment: "treatment",
    filterResponse: "response",
    filterSampleType: "sample_type",
    filterTimeFromTreatment: "time",
    sorting: "sort",
    columnVisibility: "cols",
    displayMode: "display",
    comparisonColumn: "compare",
} as const

export type HierarchicalTableState = {
    level: HierarchyLevel
    aggregationMethod: AggregationMethod
    filters: HierarchicalTableFilters
    sorting: SortingState
    columnVisibility: VisibilityState
    displayMode: "count" | "percentage"
    comparisonColumn: string
}

export type HierarchicalTableUpdates = Partial<HierarchicalTableState>

function safeJsonParse<T>(value: string | null, fallback: T): T {
    if (!value) return fallback

    try {
        return JSON.parse(value) as T
    } catch {
        return fallback
    }
}

export function parseSorting(value: string | null): MRT_SortingState {
    if (!value) return []

    return value
        .split(",")
        .map((part) => {
            const [id, dir] = part.split(".")
            if (!id || (dir !== "asc" && dir !== "desc")) return null
            return { id, desc: dir === "desc" }
        })
        .filter((item): item is MRT_SortingState[number] => item !== null)
}

export function serializeSorting(sorting: MRT_SortingState): string {
    return sorting.map(({ id, desc }) => `${encodeURIComponent(String(id))}.${desc ? "desc" : "asc"}`).join(",")
}

export function parseColumnFilters(value: string | null): MRT_ColumnFiltersState {
    return safeJsonParse<MRT_ColumnFiltersState>(value, [])
}

export function serializeColumnFilters(filters: MRT_ColumnFiltersState): string {
    return JSON.stringify(filters)
}

export function getTableStateFromSearchParams(searchParams: URLSearchParams): SearchParamTableState {
    return {
        globalFilter: searchParams.get(PARAMS.globalFilter) ?? "",
        sorting: parseSorting(searchParams.get(PARAMS.sorting)),
        columnFilters: parseColumnFilters(searchParams.get(PARAMS.columnFilters)),
    }
}

export function buildNextSearchParams(currentSearchParams: URLSearchParams, updates: SearchParamTableUpdates): URLSearchParams {
    const next = new URLSearchParams(currentSearchParams)

    if (updates.globalFilter !== undefined) {
        if (updates.globalFilter.trim()) {
            next.set(PARAMS.globalFilter, updates.globalFilter)
        } else {
            next.delete(PARAMS.globalFilter)
        }
    }

    if (updates.sorting !== undefined) {
        const serializedSorting = serializeSorting(updates.sorting)

        if (serializedSorting) {
            next.set(PARAMS.sorting, serializedSorting)
        } else {
            next.delete(PARAMS.sorting)
        }
    }

    if (updates.columnFilters !== undefined) {
        if (updates.columnFilters.length > 0) {
            next.set(PARAMS.columnFilters, serializeColumnFilters(updates.columnFilters))
        } else {
            next.delete(PARAMS.columnFilters)
        }
    }

    return next
}

export function updateTableSearchParams(
    currentSearchParams: URLSearchParams,
    setSearchParams: SetURLSearchParams,
    updates: SearchParamTableUpdates,
    options: { replace?: boolean } = { replace: true },
): void {
    const next = buildNextSearchParams(currentSearchParams, updates)
    setSearchParams(next, { replace: options.replace ?? true })
}

export function resolveUpdater<T>(updater: T | ((previous: T) => T), previous: T): T {
    return typeof updater === "function" ? (updater as (previous: T) => T)(previous) : updater
}

// Hierarchical table state management

/**
 * Parse comma-separated values from URL param
 */
function parseCommaSeparated(value: string | null): string[] {
    if (!value) return []
    return value.split(",").filter(v => v.length > 0)
}

/**
 * Serialize array to comma-separated string
 */
function serializeCommaSeparated(values: string[]): string {
    return values.join(",")
}

/**
 * Parse TanStack Table sorting from URL
 */
function parseTanStackSorting(value: string | null): SortingState {
    if (!value) return []

    return value
        .split(",")
        .map((part) => {
            const [id, dir] = part.split(".")
            if (!id || (dir !== "asc" && dir !== "desc")) return null
            return { id, desc: dir === "desc" }
        })
        .filter((item): item is SortingState[number] => item !== null)
}

/**
 * Serialize TanStack Table sorting to URL
 */
function serializeTanStackSorting(sorting: SortingState): string {
    return sorting.map(({ id, desc }) => `${encodeURIComponent(String(id))}.${desc ? "desc" : "asc"}`).join(",")
}

/**
 * Parse column visibility from URL (JSON object)
 */
function parseColumnVisibility(value: string | null): VisibilityState {
    return safeJsonParse<VisibilityState>(value, {})
}

/**
 * Compute delta between current visibility and level defaults.
 * Only returns columns that differ from defaults.
 */
function getColumnVisibilityDelta(
    visibility: VisibilityState,
    defaults: VisibilityState
): VisibilityState {
    const delta: VisibilityState = {}

    // Only include columns that differ from defaults
    for (const [key, value] of Object.entries(visibility)) {
        if (defaults[key] !== value) {
            delta[key] = value
        }
    }

    return delta
}

/**
 * Serialize column visibility to URL (JSON object of delta only)
 */
function serializeColumnVisibility(
    visibility: VisibilityState,
    level: HierarchyLevel
): string {
    const defaults = getDefaultColumnVisibility(level)
    const delta = getColumnVisibilityDelta(visibility, defaults)

    // Don't serialize if delta is empty (all match defaults)
    if (Object.keys(delta).length === 0) {
        return ""
    }

    return JSON.stringify(delta)
}

/**
 * Get hierarchical table state from URL search params with defaults
 */
export function getHierarchicalTableStateFromSearchParams(
    searchParams: URLSearchParams,
    _defaultColumnVisibility: VisibilityState = {}
): HierarchicalTableState {
    // Parse level first
    const level = (searchParams.get(HIERARCHICAL_PARAMS.level) as HierarchyLevel) || "sample"

    // Default display mode: "percentage" for all levels
    const defaultDisplayMode = "percentage"
    const displayMode = (searchParams.get(HIERARCHICAL_PARAMS.displayMode) as "count" | "percentage") || defaultDisplayMode

    // Parse delta from URL - keep as delta only (don't merge with defaults yet)
    const visibilityDelta = parseColumnVisibility(
        searchParams.get(HIERARCHICAL_PARAMS.columnVisibility)
    )

    // Note: We return delta-only state here, not merged state
    // Components should merge with defaults when needed for rendering
    // This keeps the state clean and allows proper delta encoding when saving to URL

    return {
        level,
        aggregationMethod: (searchParams.get(HIERARCHICAL_PARAMS.aggregationMethod) as AggregationMethod) || "mean",
        filters: {
            sex: parseCommaSeparated(searchParams.get(HIERARCHICAL_PARAMS.filterSex)),
            condition: parseCommaSeparated(searchParams.get(HIERARCHICAL_PARAMS.filterCondition)),
            treatment: parseCommaSeparated(searchParams.get(HIERARCHICAL_PARAMS.filterTreatment)),
            response: parseCommaSeparated(searchParams.get(HIERARCHICAL_PARAMS.filterResponse)),
            sample_type: parseCommaSeparated(searchParams.get(HIERARCHICAL_PARAMS.filterSampleType)),
            time_from_treatment: parseCommaSeparated(searchParams.get(HIERARCHICAL_PARAMS.filterTimeFromTreatment)).map(v => parseInt(v, 10)),
        },
        sorting: parseTanStackSorting(searchParams.get(HIERARCHICAL_PARAMS.sorting)),
        columnVisibility: visibilityDelta,
        displayMode,
        comparisonColumn: searchParams.get(HIERARCHICAL_PARAMS.comparisonColumn) || "response",
    }
}

/**
 * Build next search params with hierarchical table updates
 */
export function buildHierarchicalTableSearchParams(
    currentSearchParams: URLSearchParams,
    updates: HierarchicalTableUpdates
): URLSearchParams {
    const next = new URLSearchParams(currentSearchParams)

    if (updates.level !== undefined) {
        if (updates.level !== "sample") {  // Only add if not default
            next.set(HIERARCHICAL_PARAMS.level, updates.level)
        } else {
            next.delete(HIERARCHICAL_PARAMS.level)
        }
    }

    if (updates.aggregationMethod !== undefined) {
        if (updates.aggregationMethod !== "mean") {
            next.set(HIERARCHICAL_PARAMS.aggregationMethod, updates.aggregationMethod)
        } else {
            next.delete(HIERARCHICAL_PARAMS.aggregationMethod)
        }
    }

    if (updates.filters !== undefined) {
        // Sex filter
        if (updates.filters.sex !== undefined) {
            const serialized = serializeCommaSeparated(updates.filters.sex)
            if (serialized) {
                next.set(HIERARCHICAL_PARAMS.filterSex, serialized)
            } else {
                next.delete(HIERARCHICAL_PARAMS.filterSex)
            }
        }

        // Condition filter
        if (updates.filters.condition !== undefined) {
            const serialized = serializeCommaSeparated(updates.filters.condition)
            if (serialized) {
                next.set(HIERARCHICAL_PARAMS.filterCondition, serialized)
            } else {
                next.delete(HIERARCHICAL_PARAMS.filterCondition)
            }
        }

        // Treatment filter
        if (updates.filters.treatment !== undefined) {
            const serialized = serializeCommaSeparated(updates.filters.treatment)
            if (serialized) {
                next.set(HIERARCHICAL_PARAMS.filterTreatment, serialized)
            } else {
                next.delete(HIERARCHICAL_PARAMS.filterTreatment)
            }
        }

        // Response filter
        if (updates.filters.response !== undefined) {
            const serialized = serializeCommaSeparated(updates.filters.response)
            if (serialized) {
                next.set(HIERARCHICAL_PARAMS.filterResponse, serialized)
            } else {
                next.delete(HIERARCHICAL_PARAMS.filterResponse)
            }
        }

        // Sample type filter
        if (updates.filters.sample_type !== undefined) {
            const serialized = serializeCommaSeparated(updates.filters.sample_type)
            if (serialized) {
                next.set(HIERARCHICAL_PARAMS.filterSampleType, serialized)
            } else {
                next.delete(HIERARCHICAL_PARAMS.filterSampleType)
            }
        }

        // Time from treatment filter
        if (updates.filters.time_from_treatment !== undefined) {
            const serialized = serializeCommaSeparated(updates.filters.time_from_treatment.map(v => String(v)))
            if (serialized) {
                next.set(HIERARCHICAL_PARAMS.filterTimeFromTreatment, serialized)
            } else {
                next.delete(HIERARCHICAL_PARAMS.filterTimeFromTreatment)
            }
        }
    }

    if (updates.sorting !== undefined) {
        const serialized = serializeTanStackSorting(updates.sorting)
        if (serialized) {
            next.set(HIERARCHICAL_PARAMS.sorting, serialized)
        } else {
            next.delete(HIERARCHICAL_PARAMS.sorting)
        }
    }

    if (updates.columnVisibility !== undefined) {
        // Get current level to determine which defaults to use
        const level = (updates.level || currentSearchParams.get(HIERARCHICAL_PARAMS.level) as HierarchyLevel) || "sample"

        const serialized = serializeColumnVisibility(updates.columnVisibility, level)

        // Only save if there's a delta (non-empty string)
        if (serialized) {
            next.set(HIERARCHICAL_PARAMS.columnVisibility, serialized)
        } else {
            next.delete(HIERARCHICAL_PARAMS.columnVisibility)
        }
    }

    if (updates.displayMode !== undefined) {
        const defaultDisplayMode = "percentage"

        // Only add if not default
        if (updates.displayMode !== defaultDisplayMode) {
            next.set(HIERARCHICAL_PARAMS.displayMode, updates.displayMode)
        } else {
            next.delete(HIERARCHICAL_PARAMS.displayMode)
        }
    }

    if (updates.comparisonColumn !== undefined) {
        // Only add if not default
        if (updates.comparisonColumn !== "response") {
            next.set(HIERARCHICAL_PARAMS.comparisonColumn, updates.comparisonColumn)
        } else {
            next.delete(HIERARCHICAL_PARAMS.comparisonColumn)
        }
    }

    return next
}

/**
 * Update hierarchical table search params
 */
export function updateHierarchicalTableSearchParams(
    currentSearchParams: URLSearchParams,
    setSearchParams: SetURLSearchParams,
    updates: HierarchicalTableUpdates,
    options: { replace?: boolean } = { replace: true }
): void {
    const next = buildHierarchicalTableSearchParams(currentSearchParams, updates)
    setSearchParams(next, { replace: options.replace ?? true })
}
