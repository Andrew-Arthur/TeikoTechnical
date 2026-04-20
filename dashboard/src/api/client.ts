import type { DashboardData } from "../types/api"

const FAST_API = "http://127.0.0.1:8000"

export async function dashboardData(): Promise<DashboardData> {
    const responce = await fetch(`${FAST_API}/dashboard_data`)
    return responce.json()
}
