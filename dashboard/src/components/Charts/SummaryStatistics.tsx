import { memo } from "react"
import type { ChartData } from "../../types/charts"
import { getGroupColor, hexToRgba } from "../../utils/chartUtils"

type SummaryStatisticsProps = {
    chartData: ChartData
    displayMode: "count" | "percentage"
    isCellLevel: boolean
}

const SummaryStatistics = memo(function SummaryStatistics({
    chartData,
    displayMode,
    isCellLevel
}: SummaryStatisticsProps) {
    const { overallStats, groupedStats } = chartData
    const cellTypes = ["b_cell", "cd8_t_cell", "cd4_t_cell", "nk_cell", "monocyte"] as const

    const formatValue = (value: number) => {
        if (displayMode === "percentage") {
            return `${value.toFixed(1)}%`
        }
        return value.toLocaleString()
    }

    const allGroups = groupedStats.map(g => g.groupName)

    if (isCellLevel) {
        return (
            <div className="p-4 bg-white rounded-lg border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Summary Statistics</h3>

                <div className="mb-2 text-sm">
                    <span className="font-medium">Overall ({overallStats.rowCount.toLocaleString()} rows):</span>
                    {' '}μ: {formatValue(overallStats.cellStats.b_cell.mean)},
                    M: {formatValue(overallStats.cellStats.b_cell.median)},
                    σ: {formatValue(overallStats.cellStats.b_cell.stdDev)}
                </div>

                {groupedStats.map(group => {
                    const color = getGroupColor(group.groupName, allGroups)
                    const bgColor = hexToRgba(color, 0.08)
                    return (
                        <div
                            key={group.groupName}
                            className="mb-1 text-sm px-2 py-1 rounded"
                            style={{ backgroundColor: bgColor }}
                        >
                            <span className="font-medium">{group.groupName} ({group.rowCount.toLocaleString()} rows):</span>
                            {' '}μ: {formatValue(group.cellStats.b_cell.mean)},
                            M: {formatValue(group.cellStats.b_cell.median)},
                            σ: {formatValue(group.cellStats.b_cell.stdDev)}
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="p-4 bg-white rounded-lg border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Summary Statistics</h3>

            {/* Overall Statistics */}
            <div className="mb-2">
                <h4 className="text-sm font-medium text-slate-700 mb-1">
                    Overall ({overallStats.rowCount.toLocaleString()} rows)
                </h4>
                <div className="grid grid-cols-5 gap-2">
                    {cellTypes.map(cellType => (
                        <div key={cellType} className="bg-slate-50 p-2 rounded text-xs">
                            <div className="font-medium text-slate-600 mb-0.5 capitalize">
                                {cellType.replace(/_/g, ' ')}
                            </div>
                            <div>
                                μ: {formatValue(overallStats.cellStats[cellType].mean)}, M: {formatValue(overallStats.cellStats[cellType].median)}, σ: {formatValue(overallStats.cellStats[cellType].stdDev)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {groupedStats.map(group => {
                const color = getGroupColor(group.groupName, allGroups)
                const bgColor = hexToRgba(color, 0.08)
                return (
                    <div
                        key={group.groupName}
                        className="mb-2 last:mb-0 p-2 rounded"
                        style={{ backgroundColor: bgColor }}
                    >
                        <h4 className="text-sm font-medium text-slate-700 mb-1">
                            {group.groupName} ({group.rowCount.toLocaleString()} rows)
                        </h4>
                        <div className="grid grid-cols-5 gap-2">
                            {cellTypes.map(cellType => (
                                <div key={cellType} className="bg-white bg-opacity-60 p-2 rounded text-xs">
                                    <div className="font-medium text-slate-600 mb-0.5 capitalize">
                                        {cellType.replace(/_/g, ' ')}
                                    </div>
                                    <div>
                                        μ: {formatValue(group.cellStats[cellType].mean)}, M: {formatValue(group.cellStats[cellType].median)}, σ: {formatValue(group.cellStats[cellType].stdDev)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
})

export default SummaryStatistics
