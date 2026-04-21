import { memo } from "react"
import { useQuery } from "@tanstack/react-query"
import type { HierarchyLevel, AggregationMethod, HierarchicalTableFilters } from "../../types/api"
import type { ComparisonColumn } from "../../types/charts"
import { fetchStatisticalTests } from "../../api/client"

type StatisticalAnalysisProps = {
    level: HierarchyLevel
    aggregationMethod: AggregationMethod
    comparisonColumn: ComparisonColumn
    displayMode: "count" | "percentage"
    filters: HierarchicalTableFilters
}

const StatisticalAnalysis = memo(function StatisticalAnalysis({
    level,
    aggregationMethod,
    comparisonColumn,
    displayMode,
    filters
}: StatisticalAnalysisProps) {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["statistical_tests", level, aggregationMethod, comparisonColumn, displayMode, filters],
        queryFn: () => fetchStatisticalTests(level, aggregationMethod, comparisonColumn, displayMode, filters),
        enabled: comparisonColumn !== "none" && level !== "cell",
    })

    if (comparisonColumn === "none") {
        return (
            <div className="p-4 bg-white rounded-lg border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Statistical Analysis</h3>
                <p className="text-slate-600 text-sm">
                    Select a comparison column to perform statistical tests.
                </p>
            </div>
        )
    }

    if (level === "cell") {
        return (
            <div className="p-4 bg-white rounded-lg border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Statistical Analysis</h3>
                <p className="text-slate-600 text-sm">
                    Statistical analysis is not available at the cell level due to the large number of individual data points (52,500+ rows).
                    Please use Sample, Subject, or Project levels for statistical comparisons.
                </p>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="p-4 bg-white">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Statistical Analysis</h3>
                <div className="flex items-center justify-center py-8">
                    <div className="text-slate-600">Running statistical tests...</div>
                </div>
            </div>
        )
    }

    if (isError) {
        return (
            <div className="p-4 bg-white">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Statistical Analysis</h3>
                <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                    Error: {error instanceof Error ? error.message : "Failed to fetch statistical tests"}
                </div>
            </div>
        )
    }

    if (!data) return null

    return (
        <div className="p-4 bg-white rounded-lg border border-slate-200">
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Statistical Analysis</h3>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
                <div className="text-sm font-semibold text-slate-700 mb-2">Analysis Method</div>
                <p className="text-sm text-slate-600 leading-relaxed">
                    {data.test_type === 'mixed_effects' && (
                        <>
                            The <strong>Linear Mixed-Effects Model</strong> accounts for repeated measurements from the same subjects over time.
                            It treats subject as a random effect, properly handling non-independence of samples within subjects.
                            The test statistic is a t-statistic showing both the direction (positive = higher in second group, negative = lower)
                            and magnitude of the effect. <strong>Effect size</strong> is the standardized t-statistic, representing the difference
                            in standard deviation units. Larger absolute values indicate stronger effects.
                        </>
                    )}
                    {data.test_type === 'mann_whitney' && (
                        <>
                            The <strong>Mann-Whitney U test</strong> is a non-parametric test comparing two independent groups.
                            It does not assume normal distribution and tests whether one group tends to have higher values than the other.
                            <strong>Effect size</strong> is the rank-biserial correlation (ranges from -1 to +1), measuring how consistently
                            one group has higher values than the other.
                        </>
                    )}
                    {data.test_type === 'kruskal_wallis' && (
                        <>
                            The <strong>Kruskal-Wallis H test</strong> is a non-parametric test comparing three or more independent groups.
                            It is an extension of the Mann-Whitney U test and does not assume normal distribution.
                            <strong>Effect size</strong> is eta-squared (η²), representing the proportion of variance explained by group differences.
                        </>
                    )}
                </p>
                <p className="text-sm text-slate-600 leading-relaxed mt-2">
                    <strong>Multiple testing correction:</strong> FDR (False Discovery Rate) correction using the Benjamini-Hochberg method
                    controls the expected proportion of false discoveries when testing all 5 cell types simultaneously.
                </p>
            </div>

            {data.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="text-sm font-semibold text-yellow-900 mb-2">Warnings</div>
                    <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
                        {data.warnings.map((warning, i) => (
                            <li key={i}>{warning}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="bg-slate-50 rounded-lg p-4 mb-4 grid grid-cols-2 gap-4 border border-slate-200">
                <div>
                    <div className="text-xs font-medium text-slate-600 mb-1">Test Used</div>
                    <div className="text-base font-semibold text-slate-900">{data.test_display_name}</div>
                </div>
                <div>
                    <div className="text-xs font-medium text-slate-600 mb-1">Comparing</div>
                    <div className="text-sm text-slate-900">{data.groups.join(" vs ")}</div>
                </div>
                <div>
                    <div className="text-xs font-medium text-slate-600 mb-1">Correction</div>
                    <div className="text-sm text-slate-900">
                        FDR (Benjamini-Hochberg, q &lt; {data.fdr_threshold.toFixed(2)})
                    </div>
                </div>
                <div>
                    <div className="text-xs font-medium text-slate-600 mb-1">Display Mode</div>
                    <div className="text-sm text-slate-900 capitalize">{displayMode}</div>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="text-sm font-semibold text-blue-900 mb-2">Interpretation</div>
                <p className="text-sm text-blue-800 leading-relaxed">{data.interpretation}</p>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                                Cell Type
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                                Sample Sizes
                                <div className="text-[10px] font-normal normal-case text-slate-500 mt-0.5">
                                    (n per group)
                                </div>
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">
                                Test Statistic
                                <div className="text-[10px] font-normal normal-case text-slate-500 mt-0.5">
                                    ({data.test_type === 'mann_whitney' ? 'U' : data.test_type === 'kruskal_wallis' ? 'H' : data.test_type === 'mixed_effects' ? 'T' : 'F'})
                                </div>
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">
                                P-value
                                <div className="text-[10px] font-normal normal-case text-slate-500 mt-0.5">
                                    (unadjusted)
                                </div>
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">
                                q-value
                                <div className="text-[10px] font-normal normal-case text-slate-500 mt-0.5">
                                    (FDR-adjusted)
                                </div>
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">
                                Significance
                                <div className="text-[10px] font-normal normal-case text-slate-500 mt-0.5">
                                    (*, **, ***)
                                </div>
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">
                                Effect Size
                                <div className="text-[10px] font-normal normal-case text-slate-500 mt-0.5">
                                    (magnitude)
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.results_per_cell_type.map((result) => (
                            <tr
                                key={result.cell_type}
                                className={result.is_significant ? "bg-green-50" : ""}
                            >
                                <td className="px-3 py-2 text-sm font-medium text-slate-900 capitalize">
                                    {result.cell_type.replace(/_/g, ' ')}
                                    {result.warnings.length > 0 && (
                                        <span className="ml-1 text-yellow-600" title={result.warnings.join('; ')}>
                                            ⚠
                                        </span>
                                    )}
                                </td>
                                <td className="px-3 py-2 text-xs text-slate-600">
                                    {Object.entries(result.group_sample_sizes)
                                        .map(([group, n]) => `${group}: ${n}`)
                                        .join(', ')}
                                </td>
                                <td className="px-3 py-2 text-sm text-right font-mono text-slate-900">
                                    {isNaN(result.test_statistic) ? "—" : result.test_statistic.toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-sm text-right font-mono text-slate-900">
                                    {result.p_value < 0.001 ? "< 0.001" : result.p_value.toFixed(3)}
                                </td>
                                <td className="px-3 py-2 text-sm text-center font-mono text-slate-900">
                                    {result.adjusted_p_value < 0.001 ? "< 0.001" : result.adjusted_p_value.toFixed(3)}
                                </td>
                                <td className="px-3 py-2 text-center">
                                    {result.is_significant ? (
                                        <span className="text-green-700 font-semibold">
                                            {result.adjusted_p_value < 0.001 ? "***" :
                                             result.adjusted_p_value < 0.01 ? "**" : "*"}
                                        </span>
                                    ) : (
                                        <span className="text-slate-400">ns</span>
                                    )}
                                </td>
                                <td className="px-3 py-2 text-center">
                                    {result.effect_size !== null ? (
                                        <div className="flex flex-col items-center">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                result.effect_size_interpretation === "large" ? "bg-red-100 text-red-800" :
                                                result.effect_size_interpretation === "medium" ? "bg-yellow-100 text-yellow-800" :
                                                "bg-slate-100 text-slate-600"
                                            }`}>
                                                {result.effect_size_interpretation}
                                            </span>
                                            <span className="text-xs text-slate-500 mt-1">
                                                {result.effect_size.toFixed(2)}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-slate-400">—</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 text-xs text-slate-600">
                <div className="font-medium mb-1">Legend:</div>
                <div>* q &lt; 0.05, ** q &lt; 0.01, *** q &lt; 0.001 (FDR-corrected)</div>
                <div>ns = not significant; q-value = FDR-adjusted p-value</div>
                <div>Effect size: small (&lt; 0.3 or &lt; 0.06), medium (0.3-0.5 or 0.06-0.14), large (≥ 0.5 or ≥ 0.14)</div>
                <div>Green highlighting = statistically significant result</div>
            </div>
        </div>
    )
})

export default StatisticalAnalysis
