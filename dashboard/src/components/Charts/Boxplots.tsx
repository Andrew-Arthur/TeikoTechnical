import { memo, useMemo, useEffect, useRef } from "react"
import Plotly from 'plotly.js/lib/core'
import type { HierarchicalTableRow } from "../../types/api"
import type { ComparisonColumn } from "../../types/charts"
import { getGroupColors } from "../../utils/chartUtils"

// Register only the chart types we need
import PlotlyBox from 'plotly.js/lib/box'
Plotly.register([PlotlyBox])

// Import factory and create Plot component
import createPlotlyComponent from 'react-plotly.js/factory'
// @ts-expect-error - createPlotlyComponent can be default or direct export
const Plot = (createPlotlyComponent.default || createPlotlyComponent)(Plotly)

type BoxplotsProps = {
    data: HierarchicalTableRow[]
    comparisonColumn: ComparisonColumn
    displayMode: "count" | "percentage"
}

const Boxplots = memo(function Boxplots({
    data,
    comparisonColumn,
    displayMode
}: BoxplotsProps) {
    const cellTypes = ["b_cell", "cd8_t_cell", "cd4_t_cell", "nk_cell", "monocyte"] as const

    const plotData = useMemo(() => {
        // Check if we're at cell level (has cell_type_name field)
        const isCellLevel = data.length > 0 && data[0].cell_type_name !== undefined

        // Handle "none" comparison - all data in one group
        const groups = new Map<string, HierarchicalTableRow[]>()
        if (comparisonColumn === "none") {
            groups.set("All Data", data)
        } else {
            data.forEach(row => {
                const groupValue = String(row[comparisonColumn] ?? "Unknown")
                if (!groups.has(groupValue)) {
                    groups.set(groupValue, [])
                }
                groups.get(groupValue)!.push(row)
            })
        }

        const groupNames = Array.from(groups.keys())
        const colors = getGroupColors(groupNames.length)

        // Create traces
        const traces: any[] = []

        if (isCellLevel && comparisonColumn === "cell_type_name") {
            // At cell level comparing by cell type: split by cell type (5 plots)
            cellTypes.forEach((cellType, cellTypeIndex) => {
                groupNames.forEach((groupName, groupIndex) => {
                    const rows = groups.get(groupName)!

                    // Filter rows for this cell type
                    const cellTypeRows = rows.filter(row => row.cell_type_name === cellType)

                    // Extract values
                    const values = displayMode === "percentage"
                        ? cellTypeRows.map(row => row.cell_percentage as number).filter(v => v != null)
                        : cellTypeRows.map(row => row.cell_count as number).filter(v => v != null)

                    traces.push({
                        y: values,
                        type: 'box',
                        name: groupName,
                        marker: { color: colors[groupIndex] },
                        legendgroup: groupName,
                        showlegend: cellTypeIndex === 0,
                        xaxis: `x${cellTypeIndex + 1}`,
                        yaxis: `y${cellTypeIndex + 1}`,
                    })
                })
            })
        } else if (isCellLevel) {
            // At cell level NOT comparing by cell type: single plot with all cell data
            groupNames.forEach((groupName, groupIndex) => {
                const rows = groups.get(groupName)!

                // Extract values from ALL cell types
                const values = displayMode === "percentage"
                    ? rows.map(row => row.cell_percentage as number).filter(v => v != null)
                    : rows.map(row => row.cell_count as number).filter(v => v != null)

                traces.push({
                    y: values,
                    type: 'box',
                    name: groupName,
                    marker: { color: colors[groupIndex] },
                    legendgroup: groupName,
                    showlegend: true,
                    xaxis: 'x',
                    yaxis: 'y',
                })
            })
        } else {
            // Aggregated levels: use b_cell, cd8_t_cell, etc. columns
            cellTypes.forEach((cellType, cellTypeIndex) => {
                groupNames.forEach((groupName, groupIndex) => {
                    const rows = groups.get(groupName)!

                    // Extract values based on display mode
                    let values: number[]

                    if (displayMode === "percentage") {
                        // Calculate percentage from counts
                        const allCellTypes = ["b_cell", "cd8_t_cell", "cd4_t_cell", "nk_cell", "monocyte"] as const
                        values = rows
                            .filter(row => row[cellType] != null)
                            .map(row => {
                                const cellValue = (row[cellType] as number) || 0
                                const total = allCellTypes.reduce((sum, ct) => sum + ((row[ct] as number) || 0), 0)
                                return total > 0 ? (cellValue / total) * 100 : 0
                            })
                    } else {
                        values = rows
                            .map(row => row[cellType] as number)
                            .filter(val => val != null && !isNaN(val))
                    }

                    traces.push({
                        y: values,
                        type: 'box',
                        name: groupName,
                        marker: { color: colors[groupIndex] },
                        legendgroup: groupName,
                        showlegend: cellTypeIndex === 0,
                        xaxis: `x${cellTypeIndex + 1}`,
                        yaxis: `y${cellTypeIndex + 1}`,
                    })
                })
            })
        }

        return traces
    }, [data, comparisonColumn, displayMode])

    const layout = useMemo(() => {
        const yAxisTitle = displayMode === "percentage" ? "Percentage (%)" : "Cell Count"
        const isCellLevel = data.length > 0 && data[0].cell_type_name !== undefined
        // Split by cell type for: aggregated levels OR cell level comparing by cell_type_name
        const splitByCellType = !isCellLevel || comparisonColumn === "cell_type_name"

        if (splitByCellType) {
            // 5-column layout (aggregated levels or cell level with cell_type_name comparison)
            return {
                autosize: true,
                height: 400,
                margin: { l: 50, r: 20, t: 40, b: 80 },
                showlegend: true,
                legend: { orientation: 'h' as const, y: -0.15 },
                grid: {
                    rows: 1,
                    columns: 5,
                    pattern: 'independent' as const,
                    subplots: [['xy', 'x2y2', 'x3y3', 'x4y4', 'x5y5']] as any
                },
                annotations: cellTypes.map((cellType, i) => ({
                    text: cellType.replace(/_/g, ' ').toUpperCase(),
                    showarrow: false,
                    x: (i + 0.5) / 5,
                    xref: 'paper' as const,
                    y: 1.05,
                    yref: 'paper' as const,
                    xanchor: 'center' as const,
                    yanchor: 'bottom' as const,
                    font: { size: 12 }
                })),
                ...Object.fromEntries(cellTypes.map((_, i) => [
                    `yaxis${i === 0 ? '' : i + 1}`,
                    { title: i === 0 ? yAxisTitle : undefined }
                ]))
            } as any
        } else {
            // Single plot layout (cell level NOT comparing by cell_type_name)
            return {
                autosize: true,
                height: 400,
                margin: { l: 50, r: 20, t: 40, b: 80 },
                showlegend: true,
                legend: { orientation: 'h' as const, y: -0.15 },
                yaxis: { title: yAxisTitle }
            } as any
        }
    }, [displayMode, data, comparisonColumn])

    const containerRef = useRef<HTMLDivElement>(null)
    const plotRef = useRef<any>(null)

    // Watch for container resize and trigger Plotly.Plots.resize
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const resizeObserver = new ResizeObserver(() => {
            if (plotRef.current && plotRef.current.el) {
                Plotly.Plots.resize(plotRef.current.el)
            }
        })

        resizeObserver.observe(container)

        return () => {
            resizeObserver.disconnect()
        }
    }, [])

    return (
        <div className="p-4 bg-white rounded-lg border border-slate-200">
            <h3 className="text-base font-semibold text-slate-900 mb-2">Boxplots by Cell Type</h3>
            <div ref={containerRef} className="w-full min-h-100">
                <Plot
                    ref={plotRef}
                    data={plotData}
                    layout={layout}
                    config={{ responsive: true }}
                    style={{ width: '100%', minHeight: '400px' }}
                    useResizeHandler={true}
                />
            </div>
        </div>
    )
})

export default Boxplots
