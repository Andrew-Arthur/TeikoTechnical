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
  time_from_treatment: [0, 7, 14],
}

const mockFilters: HierarchicalTableFilters = {
  sex: [],
  condition: [],
  treatment: [],
  response: [],
  time_from_treatment: [],
}

describe('TableControls', () => {
  it('should render all control sections', () => {
    const mockSetLevel = vi.fn()
    const mockSetAggregationMethod = vi.fn()
    const mockSetFilters = vi.fn()
    const mockSetGlobalFilter = vi.fn()
    const mockSetDisplayMode = vi.fn()

    render(
      <TableControls
        level="sample"
        setLevel={mockSetLevel}
        aggregationMethod="mode"
        setAggregationMethod={mockSetAggregationMethod}
        filters={mockFilters}
        setFilters={mockSetFilters}
        filterOptions={mockFilterOptions}
        globalFilter=""
        setGlobalFilter={mockSetGlobalFilter}
        allColumns={[]}
        displayMode="both"
        setDisplayMode={mockSetDisplayMode}
      />
    )

    // Check for key labels
    expect(screen.getByText('Level:')).toBeInTheDocument()
    expect(screen.getByText('Aggregation:')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search table...')).toBeInTheDocument()
  })

  it('should disable aggregation when level is cell', () => {
    render(
      <TableControls
        level="cell"
        setLevel={vi.fn()}
        aggregationMethod="mode"
        setAggregationMethod={vi.fn()}
        filters={mockFilters}
        setFilters={vi.fn()}
        filterOptions={mockFilterOptions}
        globalFilter=""
        setGlobalFilter={vi.fn()}
        allColumns={[]}
        displayMode="both"
        setDisplayMode={vi.fn()}
      />
    )

    // Find the aggregation selector button
    const aggregationButton = screen.getByText('Mode').closest('button')

    expect(aggregationButton).toHaveClass('cursor-not-allowed')
    expect(aggregationButton).toHaveClass('opacity-50')
  })

  it('should call setGlobalFilter when typing in search', async () => {
    const user = userEvent.setup()
    const mockSetGlobalFilter = vi.fn()

    render(
      <TableControls
        level="sample"
        setLevel={vi.fn()}
        aggregationMethod="mode"
        setAggregationMethod={vi.fn()}
        filters={mockFilters}
        setFilters={vi.fn()}
        filterOptions={mockFilterOptions}
        globalFilter=""
        setGlobalFilter={mockSetGlobalFilter}
        allColumns={[]}
        displayMode="both"
        setDisplayMode={vi.fn()}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search table...')
    await user.type(searchInput, 'test')

    // userEvent.type sends individual character events, not accumulated strings
    expect(mockSetGlobalFilter).toHaveBeenCalledWith('t')
    expect(mockSetGlobalFilter).toHaveBeenCalledWith('e')
    expect(mockSetGlobalFilter).toHaveBeenCalledWith('s')
    expect(mockSetGlobalFilter).toHaveBeenCalledWith('t')
    expect(mockSetGlobalFilter).toHaveBeenCalledTimes(4)
  })
})
