export type FrequencyDataRow = {
    project: string
    subject: string
    condition: string
    age: number
    sex: string
    treatment: string
    responce: string
    sample: string
    sample_type: string
    time_from_treatment_start: number
    total_count: number
    population: string
    count: number
    percentage: number
}

export type CompactFrequencyDataRow = {
    project: string
    subject: string
    condition: string
    age: number
    sex: string
    treatment: string
    responce: string
    sample: string
    sample_type: string
    time_from_treatment_start: number
    total_count: number

    population: string
    count: number
    percentage: number
}

export type DashboardData = {
    sample_cell_type_frequency: FrequencyDataRow[]
}
