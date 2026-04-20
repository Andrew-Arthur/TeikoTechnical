import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import SampleCellTypeFrequencyPage from "./pages/SampleCellTypeFrequencyPage"
import Header from "./components/Header"

export default function App() {
    return (
        <BrowserRouter>
            <div className="min-h-screen bg-slate-50 text-slate-900">
                <Header />
                <Routes>
                    <Route path="/sample-cell-type-frequency" element={<SampleCellTypeFrequencyPage />} />
                    <Route path="*" element={<Navigate to="/sample-cell-type-frequency" replace />} />
                </Routes>
            </div>
        </BrowserRouter>
    )
}
