import { NavLink } from "react-router-dom"

const navItems = [
    {
        label: "Part 2: Sample Cell Type Frequency",
        path: "/sample-cell-type-frequency",
    },
    {
        label: "Part 3: Responder Analysis",
        path: "/responder-analysis",
    },
    {
        label: "Part 4: Subset Analysis",
        path: "/subset-analysis",
    },
]

export default function Header() {
    return (
        <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                <h1 className="text-lg font-semibold text-slate-900">Teiko Technical Dashboard</h1>

                <nav className="flex items-center gap-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => ["rounded-xl px-4 py-2 text-sm font-medium transition", isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"].join(" ")}
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
            </div>
        </header>
    )
}
