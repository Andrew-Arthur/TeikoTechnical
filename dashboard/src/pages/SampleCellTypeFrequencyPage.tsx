import { useQuery } from "@tanstack/react-query"
import { getSampleCellTypeFrequency } from "../api/client"
import SampleCellTypeFrequencyTable from "../components/SampleCellTypeFrequencyTable"

export default function SampleCellTypeFrequencyPage() {
    const {
        data = [],
        isLoading,
        isError,
        error,
    } = useQuery({
        queryKey: ["sample_cell_type_frequency"],
        queryFn: getSampleCellTypeFrequency,
    })

    if (isLoading) {
        return <div className="p-6 text-slate-600">Loading...</div>
    }

    if (isError) {
        return <div className="p-6 text-red-600">Failed to load: {error instanceof Error ? error.message : "Unknown error"}</div>
    }

    return (
        <div className="mx-auto max-w-7xl px-6 py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-semibold tracking-tight">Sample Cell Type Frequency</h1>
                <p className="mt-2 text-slate-600">Relative frequency of each immune cell population in each sample.</p>
            </div>

            <SampleCellTypeFrequencyTable rows={data} />
        </div>
    )
}
