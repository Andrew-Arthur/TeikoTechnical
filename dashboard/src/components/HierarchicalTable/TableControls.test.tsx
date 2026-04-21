import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TableControls from './TableControls'
import type { HierarchicalTableFilters, FilterOptions } from '../../types/api'

const mockFilterOptions: FilterOptions = {
  sex: ['M', 'F'],
  condition: ['melanoma', 'healthy'],
  treatment: ['treatment_A', 'treatment_B'],
  response: ['responder', 'non-responder'],
  sample_type: ['PBMC', 'Tumor'],
  time_from_treatment: [0, 7, 14],
}

const mockFilters: HierarchicalTableFilters = {
  sex: [],
  condition: [],
  treatment: [],
  response: [],
  sample_type: [],
  time_from_treatment: [],
}

describe('TableControls', () => {
  it('should render all control sections', () => {
    const mockSetLevel = vi.fn()
    const mockSetAggregationMethod = vi.fn()
    const mockSetFilters = vi.fn()
    const mockSetDisplayMode = vi.fn()
    const mockSetComparisonColumn = vi.fn()

    render(
      <TableControls
        level="sample"
        setLevel={mockSetLevel}
        aggregationMethod="mean"
        setAggregationMethod={mockSetAggregationMethod}
        filters={mockFilters}
        setFilters={mockSetFilters}
        filterOptions={mockFilterOptions}
        allColumns={[]}
        displayMode="percentage"
        setDisplayMode={mockSetDisplayMode}
        comparisonColumn="response"
        setComparisonColumn={mockSetComparisonColumn}
        availableComparisonColumns={["response", "sex", "none"]}
      />
    )

    // Check for key labels
    expect(screen.getByText('Level:')).toBeInTheDocument()
    expect(screen.getByText('Display:')).toBeInTheDocument()
    expect(screen.getByText('Filters:')).toBeInTheDocument()
  })

  it('should disable aggregation when level is cell', () => {
    render(
      <TableControls
        level="cell"
        setLevel={vi.fn()}
        aggregationMethod="mean"
        setAggregationMethod={vi.fn()}
        filters={mockFilters}
        setFilters={vi.fn()}
        filterOptions={mockFilterOptions}
        allColumns={[]}
        displayMode="percentage"
        setDisplayMode={vi.fn()}
        comparisonColumn="response"
        setComparisonColumn={vi.fn()}
        availableComparisonColumns={["response", "sex", "none"]}
      />
    )

    // Cell level should not show aggregation control
    expect(screen.queryByText('Aggregation')).not.toBeInTheDocument()

    // But should show display mode
    expect(screen.getByText('Display:')).toBeInTheDocument()
  })

  it('should render filter controls', async () => {
    render(
      <TableControls
        level="sample"
        setLevel={vi.fn()}
        aggregationMethod="mean"
        setAggregationMethod={vi.fn()}
        filters={mockFilters}
        setFilters={vi.fn()}
        filterOptions={mockFilterOptions}
        allColumns={[]}
        displayMode="percentage"
        setDisplayMode={vi.fn()}
        comparisonColumn="response"
        setComparisonColumn={vi.fn()}
        availableComparisonColumns={["response", "sex", "treatment", "none"]}
      />
    )

    // Filter dropdowns should be rendered
    expect(screen.getByText('Sex (0)')).toBeInTheDocument()
    expect(screen.getByText('Condition (0)')).toBeInTheDocument()
  })
})
