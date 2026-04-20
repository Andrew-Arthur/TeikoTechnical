import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import DashboardPage from "./pages/DashboardPage"

export default function App() {
    return (
        <BrowserRouter>
            <div className="min-h-screen bg-slate-50 text-slate-900">
                <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </BrowserRouter>
    )
}
