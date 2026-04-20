import type { MRT_ColumnFiltersState, MRT_SortingState } from "material-react-table"
import type { SetURLSearchParams } from "react-router"

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
