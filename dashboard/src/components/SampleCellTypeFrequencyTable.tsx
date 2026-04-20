import { useDeferredValue, useMemo, useState } from "react"
import type { SampleCellTypeFrequencyRow } from "../types/api"

type SampleCellTypeFrequencyTableProps = {
    rows: SampleCellTypeFrequencyRow[]
}

const SEARCH_FIELDS: (keyof SampleCellTypeFrequencyRow)[] = ["sample", "population"]

const COLUMNS: {
    header: string
    render: (row: SampleCellTypeFrequencyRow) => React.ReactNode
}[] = [
    { header: "Sample", render: (row) => row.sample },
    { header: "Total Count", render: (row) => row.total_count },
    { header: "Population", render: (row) => row.population },
    { header: "Count", render: (row) => row.count },
    { header: "Percentage", render: (row) => row.percentage.toFixed(2) },
]

function matchesSearch(row: SampleCellTypeFrequencyRow, query: string): boolean {
    return SEARCH_FIELDS.some((field) => String(row[field]).toLowerCase().includes(query))
}

export default function SampleCellTypeFrequencyTable({ rows }: SampleCellTypeFrequencyTableProps) {
    const [search, setSearch] = useState("")
    const deferredSearch = useDeferredValue(search)

    const filteredRows = useMemo(() => {
        const query = deferredSearch.trim().toLowerCase()
        return query ? rows.filter((row) => matchesSearch(row, query)) : rows
    }, [rows, deferredSearch])

    return (
        <div className="space-y-4">
            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sample or population"
                className="w-full max-w-sm rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
            />

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            {COLUMNS.map((column) => (
                                <th key={column.header} className="px-4 py-3 text-left font-semibold text-slate-700">
                                    {column.header}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {filteredRows.map((row) => (
                            <tr key={`${row.sample}-${row.population}`} className="border-t border-slate-200">
                                {COLUMNS.map((column) => (
                                    <td key={column.header} className="px-4 py-3">
                                        {column.render(row)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="text-sm text-slate-600">Showing {filteredRows.length} rows</p>
        </div>
    )
}
