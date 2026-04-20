import type { SampleCellTypeFrequencyRow } from "../types/api"

const FAST_API = "http://127.0.0.1:8000"

export async function getSampleCellTypeFrequency(): Promise<SampleCellTypeFrequencyRow[]> {
    const responce = await fetch(`${FAST_API}/sample_cell_type_frequency`)
    return responce.json()
}
