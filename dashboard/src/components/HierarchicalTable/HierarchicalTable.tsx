import { useMemo, useRef, memo } from "react"
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
} from "@tanstack/react-table"
import type { SortingState, VisibilityState } from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/20/solid"
import type { HierarchicalTableRow, HierarchyLevel } from "../../types/api"
import type { ComparisonColumn } from "../../types/charts"
import { getColumnsForLevel } from "./columns"
import { getDefaultColumnVisibility } from "./columnDefaults"
import { getGroupColor, hexToRgba } from "../../utils/chartUtils"

type HierarchicalTableProps = {
    data: HierarchicalTableRow[]
    level: HierarchyLevel
    sorting: SortingState
    setSorting: (value: SortingState | ((old: SortingState) => SortingState)) => void
    columnVisibility: VisibilityState
    setColumnVisibility: (value: VisibilityState | ((old: VisibilityState) => VisibilityState)) => void
    displayMode: "count" | "percentage"
    comparisonColumn: ComparisonColumn
}

const HierarchicalTable = memo(function HierarchicalTable({
    data,
    level,
    sorting,
    setSorting,
    columnVisibility,
    setColumnVisibility,
    displayMode,
    comparisonColumn,
}: HierarchicalTableProps) {
    const columns = useMemo(() => getColumnsForLevel(level), [level])

    const allGroups = useMemo(() => {
        if (comparisonColumn === "none" || !data || data.length === 0) return []
        const uniqueGroups = new Set(data.map(row => String(row[comparisonColumn] ?? "Unknown")))
        return Array.from(uniqueGroups).sort()
    }, [data, comparisonColumn])

    const getRowColor = (row: HierarchicalTableRow) => {
        if (comparisonColumn === "none" || allGroups.length === 0) return undefined
        const groupValue = String(row[comparisonColumn] ?? "Unknown")
        const color = getGroupColor(groupValue, allGroups)
        return hexToRgba(color, 0.08)
    }

    const mergedVisibility = useMemo(() => {
        const defaults = getDefaultColumnVisibility(level)
        const merged = {
            ...defaults,
            ...columnVisibility,  // Delta overrides defaults
        }

        // Apply display mode if no explicit column visibility delta
        const hasExplicitDelta = Object.keys(columnVisibility).length > 0
        if (!hasExplicitDelta) {
            const cellTypes = ["b_cell", "cd8_t_cell", "cd4_t_cell", "nk_cell", "monocyte"]

            if (level === "cell") {
                // Cell level: Always show both cell_count and cell_percentage columns
                // Display mode only affects charts, not table visibility
                merged["cell_count"] = true
                merged["cell_percentage"] = true
            } else {
                // Aggregated levels: Display mode controls which columns are visible
                cellTypes.forEach(cellType => {
                    if (displayMode === "count") {
                        merged[cellType] = true
                        merged[`${cellType}_pct`] = false
                    } else if (displayMode === "percentage") {
                        merged[cellType] = false
                        merged[`${cellType}_pct`] = true
                    }
                })
            }
        }

        return merged
    }, [level, columnVisibility, displayMode])

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            columnVisibility: mergedVisibility,
        },
        onSortingChange: setSorting,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
    })

    const { rows } = table.getRowModel()

    // Virtual scrolling setup
    const tableContainerRef = useRef<HTMLDivElement>(null)

    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => 35, // Estimated row height in pixels
        overscan: 10, // Render 10 extra rows above/below viewport for smooth scrolling
    })

    const virtualRows = rowVirtualizer.getVirtualItems()
    const totalSize = rowVirtualizer.getTotalSize()

    const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0
    const paddingBottom = virtualRows.length > 0
        ? totalSize - (virtualRows[virtualRows.length - 1]?.end || 0)
        : 0

    return (
        <div ref={tableContainerRef} className="overflow-auto h-full">
            {rows.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                    <div className="text-slate-500 text-sm">
                        No results found. Try adjusting filters.
                    </div>
                </div>
            ) : (
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 sticky top-0 z-5">
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <th
                                        key={header.id}
                                        className="px-3 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer select-none hover:bg-slate-100"
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        <div className="flex items-center gap-1">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                            {{
                                                asc: <ChevronUpIcon className="h-4 w-4" />,
                                                desc: <ChevronDownIcon className="h-4 w-4" />,
                                            }[header.column.getIsSorted() as string] ?? null}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                        {paddingTop > 0 && (
                            <tr>
                                <td style={{ height: `${paddingTop}px` }} />
                            </tr>
                        )}
                        {virtualRows.map(virtualRow => {
                            const row = rows[virtualRow.index]
                            const bgColor = getRowColor(row.original)
                            return (
                                <tr
                                    key={row.id}
                                    className="hover:bg-slate-50"
                                    style={bgColor ? { backgroundColor: bgColor } : undefined}
                                >
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} className="px-3 py-2 text-sm text-slate-900 whitespace-nowrap">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            )
                        })}
                        {paddingBottom > 0 && (
                            <tr>
                                <td style={{ height: `${paddingBottom}px` }} />
                            </tr>
                        )}
                    </tbody>
                </table>
            )}

            {/* Row count */}
            <div className="px-3 py-2 text-sm text-slate-600 bg-slate-50 border-t border-slate-200 sticky bottom-0">
                {rows.length.toLocaleString()} {rows.length === 1 ? 'row' : 'rows'}
            </div>
        </div>
    )
})

export default HierarchicalTable
