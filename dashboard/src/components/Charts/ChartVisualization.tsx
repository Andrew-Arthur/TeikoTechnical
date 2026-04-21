import { memo, useMemo } from "react"
import SummaryStatistics from "./SummaryStatistics"
import Boxplots from "./Boxplots"
import StatisticalAnalysis from "./StatisticalAnalysis"
import type { HierarchicalTableRow, HierarchyLevel, AggregationMethod, HierarchicalTableFilters } from "../../types/api"
import type { ComparisonColumn } from "../../types/charts"
import { processChartData } from "../../utils/chartUtils"

type ChartVisualizationProps = {
    data: HierarchicalTableRow[]
    comparisonColumn: ComparisonColumn
    displayMode: "count" | "percentage"
    level: HierarchyLevel
    aggregationMethod: AggregationMethod
    filters: HierarchicalTableFilters
}

const ChartVisualization = memo(function ChartVisualization({
    data,
    comparisonColumn,
    displayMode,
    level,
    aggregationMethod,
    filters
}: ChartVisualizationProps) {
    // Check if we're at cell level
    const isCellLevel = data.length > 0 && data[0].cell_type_name !== undefined

    // Process data for statistics
    const chartData = useMemo(() => {
        return processChartData(data, comparisonColumn, displayMode)
    }, [data, comparisonColumn, displayMode])

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500">
                <div className="text-center">
                    <p className="text-lg font-medium">No Data Available</p>
                    <p className="text-sm mt-2">Apply filters or select a different level to view charts</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full overflow-auto bg-slate-50 p-4 space-y-4">
            <SummaryStatistics
                chartData={chartData}
                displayMode={displayMode}
                isCellLevel={isCellLevel}
            />

            <Boxplots
                data={data}
                comparisonColumn={comparisonColumn}
                displayMode={displayMode}
            />

            {/* Statistical Analysis Section */}
            <StatisticalAnalysis
                level={level}
                aggregationMethod={aggregationMethod}
                comparisonColumn={comparisonColumn}
                displayMode={displayMode}
                filters={filters}
            />
        </div>
    )
})

export default ChartVisualization
