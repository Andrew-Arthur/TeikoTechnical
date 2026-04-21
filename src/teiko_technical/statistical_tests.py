"""
Statistical analysis module for comparing cell population frequencies between groups.

Implements:
- Mann-Whitney U test (2 groups, independent samples)
- Kruskal-Wallis H test (3+ groups, independent samples)
- Linear Mixed-Effects Model (repeated measures)
- FDR correction (Benjamini-Hochberg)
"""

from dataclasses import dataclass, asdict
from typing import Optional
import numpy as np
from scipy import stats
import pandas as pd


@dataclass
class StatisticalTestResult:
    """Result for a single cell type."""
    cell_type: str
    test_name: str
    test_statistic: float
    p_value: float
    adjusted_p_value: float
    is_significant: bool
    effect_size: Optional[float]
    effect_size_interpretation: Optional[str]
    group_sample_sizes: dict[str, int]
    warnings: list[str]


@dataclass
class StatisticalAnalysisResult:
    """Complete statistical analysis result for all cell types."""
    results_per_cell_type: list[StatisticalTestResult]
    comparison_column: str
    groups: list[str]
    test_type: str
    test_display_name: str
    correction_method: str
    alpha: float
    fdr_threshold: float
    total_comparisons: int
    interpretation: str
    warnings: list[str]


def select_appropriate_test(
    level: str,
    aggregation_method: Optional[str],
    num_groups: int
) -> tuple[str, str]:
    """
    Selects statistical test based on data structure.

    Args:
        level: Hierarchy level ("project", "subject", "sample", "cell")
        aggregation_method: Method used for aggregation (e.g., "median", "mode")
        num_groups: Number of comparison groups

    Returns:
        Tuple of (test_type, test_display_name)
    """
    if num_groups < 2:
        return ("insufficient_groups", "Insufficient Groups")

    # Only project and subject levels have truly independent samples after aggregation
    # Sample level has repeated measures (multiple samples per subject)
    # Cell level has repeated measures (multiple cells per sample)
    if level in ['project', 'subject'] and aggregation_method:
        if num_groups == 2:
            return ("mann_whitney", "Mann-Whitney U test")
        else:
            return ("kruskal_wallis", "Kruskal-Wallis H test")

    # Sample level (repeated measures across time) or non-aggregated data → mixed-effects
    return ("mixed_effects", "Linear Mixed-Effects Model")


def perform_mann_whitney(
    group1_values: list[float],
    group2_values: list[float]
) -> tuple[float, float, float, str]:
    """
    Performs Mann-Whitney U test and calculates rank-biserial correlation.

    Args:
        group1_values: Values for first group
        group2_values: Values for second group

    Returns:
        Tuple of (statistic, p_value, effect_size, effect_size_interpretation)
    """
    statistic, p_value = stats.mannwhitneyu(
        group1_values, group2_values, alternative='two-sided'
    )

    n1, n2 = len(group1_values), len(group2_values)
    rank_biserial = 1 - (2 * statistic) / (n1 * n2)

    effect_size_interp = (
        "large" if abs(rank_biserial) >= 0.5 else
        "medium" if abs(rank_biserial) >= 0.3 else
        "small"
    )

    return statistic, p_value, rank_biserial, effect_size_interp


def perform_kruskal_wallis(
    groups_dict: dict[str, list[float]]
) -> tuple[float, float, float, str]:
    """
    Performs Kruskal-Wallis H test and calculates eta-squared.

    Args:
        groups_dict: Dictionary mapping group names to value lists

    Returns:
        Tuple of (statistic, p_value, effect_size, effect_size_interpretation)
    """
    groups_list = list(groups_dict.values())
    statistic, p_value = stats.kruskal(*groups_list)

    n = sum(len(g) for g in groups_list)
    k = len(groups_list)
    eta_squared = (statistic - k + 1) / (n - k) if (n - k) > 0 else 0

    effect_size_interp = (
        "large" if eta_squared >= 0.14 else
        "medium" if eta_squared >= 0.06 else
        "small"
    )

    return statistic, p_value, eta_squared, effect_size_interp


def perform_mixed_effects(
    data_df: pd.DataFrame,
    cell_type: str,
    comparison_column: str
) -> tuple[Optional[float], Optional[float], Optional[float], Optional[str]]:
    """
    Performs linear mixed-effects model with subject as random effect.

    Args:
        data_df: DataFrame with columns: subject_id, comparison_column, cell_type values
        cell_type: Name of cell type column
        comparison_column: Name of grouping variable

    Returns:
        Tuple of (coefficient, p_value, effect_size, "standardized")
        Returns (None, None, None, None) if statsmodels unavailable
    """
    try:
        from statsmodels.regression.mixed_linear_model import MixedLM

        # Drop rows with missing values
        df_clean = data_df[[comparison_column, cell_type, "subject_id"]].dropna()

        if len(df_clean) < 10:
            return (None, None, None, None)

        # Fit mixed model
        model = MixedLM.from_formula(
            f"{cell_type} ~ C({comparison_column})",
            data=df_clean,
            groups=df_clean["subject_id"]
        )
        result = model.fit(reml=False)

        # Extract coefficient for first comparison group (not intercept)
        # params are indexed by coefficient names, not integers
        if len(result.params) > 1:
            # Get the first non-intercept parameter
            param_names = list(result.params.index)
            # Skip intercept (first param)
            if len(param_names) > 1:
                coef_name = param_names[1]
                coef = result.params[coef_name]
                std_err = result.bse[coef_name]
                p_value = result.pvalues[coef_name]
                # Test statistic is t-statistic
                test_stat = coef / std_err

                # Effect size: standardized coefficient
                effect_size = test_stat

                return test_stat, p_value, effect_size, "standardized"

        return (None, None, None, None)

    except ImportError:
        return (None, None, None, None)
    except Exception as e:
        # Log error for debugging but don't crash
        print(f"Mixed-effects model error for {cell_type}: {str(e)}")
        return (None, None, None, None)


def perform_statistical_analysis(
    data: list[dict],
    comparison_column: str,
    level: str,
    aggregation_method: Optional[str],
    display_mode: str
) -> StatisticalAnalysisResult:
    """
    Main entry point for statistical analysis.

    Args:
        data: List of dictionaries containing hierarchical table data
        comparison_column: Column to group by for comparison
        level: Hierarchy level
        aggregation_method: Aggregation method (or None)
        display_mode: "percentage" or "count"

    Returns:
        StatisticalAnalysisResult with test results for all cell types
    """
    # Handle no comparison
    if comparison_column == "none" or not data:
        return StatisticalAnalysisResult(
            results_per_cell_type=[],
            comparison_column=comparison_column,
            groups=[],
            test_type="none",
            test_display_name="No comparison selected",
            correction_method="fdr_bh",
            alpha=0.05,
            fdr_threshold=0.05,
            total_comparisons=5,
            interpretation="Please select a comparison column to perform statistical tests.",
            warnings=[]
        )

    # Group data by comparison column
    groups = {}
    for row in data:
        group_value = str(row.get(comparison_column, "Unknown"))
        if group_value not in groups:
            groups[group_value] = []
        groups[group_value].append(row)

    num_groups = len(groups)

    # Select appropriate test
    test_type, test_display_name = select_appropriate_test(
        level, aggregation_method, num_groups
    )

    # Handle insufficient groups
    if test_type == "insufficient_groups":
        return StatisticalAnalysisResult(
            results_per_cell_type=[],
            comparison_column=comparison_column,
            groups=list(groups.keys()),
            test_type="insufficient_groups",
            test_display_name="Insufficient Groups",
            correction_method="fdr_bh",
            alpha=0.05,
            fdr_threshold=0.05,
            total_comparisons=5,
            interpretation="At least 2 groups are required for statistical comparison.",
            warnings=[]
        )

    # Perform tests for each cell type
    cell_types = ["b_cell", "cd8_t_cell", "cd4_t_cell", "nk_cell", "monocyte"]
    temp_results = []

    for cell_type in cell_types:
        # Extract values for this cell type
        groups_values = {}
        for group_name, rows in groups.items():
            values = []
            for row in rows:
                if display_mode == "percentage":
                    # Check for cell level first
                    if "cell_percentage" in row:
                        val = row.get("cell_percentage")
                    else:
                        # Calculate percentage from counts
                        cell_val = row.get(cell_type, 0)
                        total_val = row.get("total_count", 1)
                        val = (cell_val / total_val * 100) if total_val > 0 else 0
                else:
                    # Use count
                    if "cell_count" in row:
                        val = row.get("cell_count")
                    else:
                        val = row.get(cell_type)

                if val is not None and not np.isnan(val):
                    values.append(float(val))

            groups_values[group_name] = values

        # Check for insufficient data
        warnings = []
        sample_sizes = {name: len(vals) for name, vals in groups_values.items()}

        for group_name, vals in groups_values.items():
            if len(vals) < 5:
                warnings.append(
                    f"Small sample size in group '{group_name}' (n={len(vals)}). "
                    f"Results may not be reliable."
                )

        # Perform appropriate test
        if test_type == "mann_whitney":
            group_names = list(groups_values.keys())
            if len(groups_values[group_names[0]]) > 0 and len(groups_values[group_names[1]]) > 0:
                stat, p_val, effect, effect_interp = perform_mann_whitney(
                    groups_values[group_names[0]],
                    groups_values[group_names[1]]
                )
            else:
                stat, p_val, effect, effect_interp = (np.nan, 1.0, None, None)
                warnings.append("Insufficient valid data for test.")

        elif test_type == "kruskal_wallis":
            valid_groups = {k: v for k, v in groups_values.items() if len(v) > 0}
            if len(valid_groups) >= 2:
                stat, p_val, effect, effect_interp = perform_kruskal_wallis(valid_groups)
            else:
                stat, p_val, effect, effect_interp = (np.nan, 1.0, None, None)
                warnings.append("Insufficient valid data for test.")

        else:  # mixed_effects
            # Check if dataset is too large for mixed-effects (> 20000 rows)
            # Mixed-effects models are computationally expensive
            if len(data) > 20000:
                # Fall back to Kruskal-Wallis for very large datasets
                valid_groups = {k: v for k, v in groups_values.items() if len(v) > 0}
                if len(valid_groups) >= 2:
                    stat, p_val, effect, effect_interp = perform_kruskal_wallis(valid_groups)
                else:
                    stat, p_val, effect, effect_interp = (np.nan, 1.0, None, None)
                    warnings.append("Insufficient valid data for test.")
                test_display_name = "Kruskal-Wallis H test (fallback)"
                warnings.append(
                    f"Dataset too large ({len(data)} rows) for mixed-effects model. "
                    "Using Kruskal-Wallis test as fallback."
                )
            else:
                # Prepare DataFrame for mixed model
                df_rows = []
                for row in data:
                    # Get value based on display mode
                    if display_mode == "percentage":
                        # Check if cell level (has cell_percentage column)
                        if "cell_percentage" in row:
                            value = row.get("cell_percentage")
                        else:
                            # Sample/aggregated level: calculate percentage from counts
                            cell_val = row.get(cell_type, 0)
                            total_val = sum([
                                row.get("b_cell", 0),
                                row.get("cd8_t_cell", 0),
                                row.get("cd4_t_cell", 0),
                                row.get("nk_cell", 0),
                                row.get("monocyte", 0)
                            ])
                            value = (cell_val / total_val * 100) if total_val > 0 else 0
                    else:
                        # Count mode
                        if "cell_count" in row:
                            value = row.get("cell_count")
                        else:
                            value = row.get(cell_type)

                    df_rows.append({
                        "subject_id": row.get("subject_id"),
                        comparison_column: row.get(comparison_column),
                        cell_type: value
                    })
                df = pd.DataFrame(df_rows)

                stat, p_val, effect, effect_interp = perform_mixed_effects(
                    df, cell_type, comparison_column
                )

            if stat is None:
                # Fallback to Kruskal-Wallis
                stat, p_val, effect, effect_interp = perform_kruskal_wallis(groups_values)
                test_display_name = "Kruskal-Wallis H test (fallback)"
                warnings.append(
                    "Mixed-effects model failed (statsmodels not available or insufficient data). "
                    "Using Kruskal-Wallis test as fallback."
                )

        temp_results.append({
            'cell_type': cell_type,
            'test_name': test_display_name,
            'test_statistic': stat,
            'p_value': p_val,
            'effect_size': effect,
            'effect_size_interpretation': effect_interp,
            'group_sample_sizes': sample_sizes,
            'warnings': warnings
        })

    # Apply FDR correction (Benjamini-Hochberg)
    from statsmodels.stats.multitest import multipletests

    p_values = [r['p_value'] for r in temp_results]
    reject, p_adjusted, _, _ = multipletests(p_values, alpha=0.05, method='fdr_bh')

    # Create final results with adjusted p-values
    results_per_cell_type = []
    for i, temp in enumerate(temp_results):
        results_per_cell_type.append(StatisticalTestResult(
            cell_type=temp['cell_type'],
            test_name=temp['test_name'],
            test_statistic=temp['test_statistic'],
            p_value=temp['p_value'],
            adjusted_p_value=p_adjusted[i],
            is_significant=bool(reject[i]),
            effect_size=temp['effect_size'],
            effect_size_interpretation=temp['effect_size_interpretation'],
            group_sample_sizes=temp['group_sample_sizes'],
            warnings=temp['warnings']
        ))

    # Generate interpretation
    significant_count = sum(1 for r in results_per_cell_type if r.is_significant)
    interpretation = (
        f"{significant_count} out of {len(cell_types)} cell types showed significant differences "
        f"between groups ({test_display_name}, FDR-corrected q < 0.05)."
    )

    # Add detail about most significant if any exist
    if significant_count > 0:
        most_sig = min(results_per_cell_type, key=lambda r: r.adjusted_p_value)
        if most_sig.effect_size is not None:
            interpretation += (
                f" {most_sig.cell_type.replace('_', ' ').title()} shows "
                f"a {most_sig.effect_size_interpretation} effect."
            )

    return StatisticalAnalysisResult(
        results_per_cell_type=results_per_cell_type,
        comparison_column=comparison_column,
        groups=list(groups.keys()),
        test_type=test_type,
        test_display_name=test_display_name,
        correction_method="fdr_bh",
        alpha=0.05,
        fdr_threshold=0.05,
        total_comparisons=5,
        interpretation=interpretation,
        warnings=[]
    )
