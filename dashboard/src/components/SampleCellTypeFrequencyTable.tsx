import { useMemo } from "react"
import type { SampleCellTypeFrequencyRow } from "../types/api"
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from "material-react-table"
import { useSearchParams } from "react-router"
import { getTableStateFromSearchParams, resolveUpdater, updateTableSearchParams } from "../services/search-param-service"

type SampleCellTypeFrequencyTableProps = {
    data: SampleCellTypeFrequencyRow[]
}

export default function SampleCellTypeFrequencyTable({ data }: SampleCellTypeFrequencyTableProps) {
    const columns = useMemo<MRT_ColumnDef<SampleCellTypeFrequencyRow>[]>(
        () => [
            {
                accessorKey: "sample",
                header: "Sample",
            },
        ],
        [],
    )

    const [searchParams, setSearchParams] = useSearchParams()

    const { globalFilter, sorting, columnFilters } = getTableStateFromSearchParams(searchParams)

    const table = useMaterialReactTable({
        columns,
        data,
        state: {
            globalFilter,
            sorting,
            columnFilters,
        },
        onGlobalFilterChange: (updater) => {
            const nextValue = resolveUpdater(updater, globalFilter)
            updateTableSearchParams(searchParams, setSearchParams, {
                globalFilter: nextValue,
            })
        },
        onSortingChange: (updater) => {
            const nextValue = resolveUpdater(updater, sorting)
            updateTableSearchParams(searchParams, setSearchParams, {
                sorting: nextValue,
            })
        },
        onColumnFiltersChange: (updater) => {
            const nextValue = resolveUpdater(updater, columnFilters)
            updateTableSearchParams(searchParams, setSearchParams, {
                columnFilters: nextValue,
            })
        },
    })

    return <MaterialReactTable table={table} />
}
