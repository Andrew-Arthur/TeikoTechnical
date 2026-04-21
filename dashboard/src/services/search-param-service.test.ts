import { describe, it, expect } from 'vitest'
import {
    getHierarchicalTableStateFromSearchParams,
    buildHierarchicalTableSearchParams,
    HIERARCHICAL_PARAMS,
} from './search-param-service'
import type { HierarchyLevel } from '../types/api'

describe('search-param-service', () => {
    describe('Display Mode Defaults', () => {
        it('should default to "percentage" for sample level (aggregated)', () => {
            const params = new URLSearchParams()
            const state = getHierarchicalTableStateFromSearchParams(params)

            expect(state.level).toBe('sample')
            expect(state.displayMode).toBe('percentage')
        })

        it('should default to "percentage" for project level (aggregated)', () => {
            const params = new URLSearchParams('level=project')
            const state = getHierarchicalTableStateFromSearchParams(params)

            expect(state.level).toBe('project')
            expect(state.displayMode).toBe('percentage')
        })

        it('should default to "percentage" for subject level (aggregated)', () => {
            const params = new URLSearchParams('level=subject')
            const state = getHierarchicalTableStateFromSearchParams(params)

            expect(state.level).toBe('subject')
            expect(state.displayMode).toBe('percentage')
        })

        it('should default to "percentage" for cell level', () => {
            const params = new URLSearchParams('level=cell')
            const state = getHierarchicalTableStateFromSearchParams(params)

            expect(state.level).toBe('cell')
            expect(state.displayMode).toBe('percentage')
        })

        it('should respect explicit display mode in URL for aggregated levels', () => {
            const params = new URLSearchParams('level=sample&display=count')
            const state = getHierarchicalTableStateFromSearchParams(params)

            expect(state.displayMode).toBe('count')
        })

        it('should respect explicit display mode in URL for cell level', () => {
            const params = new URLSearchParams('level=cell&display=percentage')
            const state = getHierarchicalTableStateFromSearchParams(params)

            expect(state.displayMode).toBe('percentage')
        })
    })

    describe('Display Mode URL Serialization', () => {
        it('should omit display mode from URL when it matches default for aggregated levels', () => {
            const current = new URLSearchParams('level=sample')
            const next = buildHierarchicalTableSearchParams(current, {
                displayMode: 'percentage',
            })

            expect(next.has(HIERARCHICAL_PARAMS.displayMode)).toBe(false)
        })

        it('should include display mode in URL when it differs from default for aggregated levels', () => {
            const current = new URLSearchParams('level=sample')
            const next = buildHierarchicalTableSearchParams(current, {
                displayMode: 'count',
            })

            expect(next.get(HIERARCHICAL_PARAMS.displayMode)).toBe('count')
        })

        it('should omit display mode from URL when it matches default for cell level', () => {
            const current = new URLSearchParams('level=cell')
            const next = buildHierarchicalTableSearchParams(current, {
                displayMode: 'percentage',
            })

            expect(next.has(HIERARCHICAL_PARAMS.displayMode)).toBe(false)
        })

        it('should include display mode in URL when it differs from default for cell level', () => {
            const current = new URLSearchParams('level=cell')
            const next = buildHierarchicalTableSearchParams(current, {
                displayMode: 'count',
            })

            expect(next.get(HIERARCHICAL_PARAMS.displayMode)).toBe('count')
        })

        it('should handle level change with appropriate display mode default', () => {
            // Start at sample level with count mode
            const current = new URLSearchParams('level=sample&display=count')

            // Change to cell level without specifying display mode
            const next = buildHierarchicalTableSearchParams(current, {
                level: 'cell',
            })

            // Display mode should persist from current params
            expect(next.get('level')).toBe('cell')
            expect(next.get('display')).toBe('count')
        })
    })

    describe('Column Visibility with Display Mode', () => {
        it('should return empty delta when no explicit cols param', () => {
            const params = new URLSearchParams('level=sample')
            const state = getHierarchicalTableStateFromSearchParams(params)

            // Should return empty delta (no explicit column overrides)
            // Display mode is handled at render time, not in state
            expect(Object.keys(state.columnVisibility).length).toBe(0)
        })

        it('should return empty delta for cell level with no explicit cols param', () => {
            const params = new URLSearchParams('level=cell')
            const state = getHierarchicalTableStateFromSearchParams(params)

            // Should return empty delta
            expect(Object.keys(state.columnVisibility).length).toBe(0)
        })

        it('should return empty delta when display=count (display mode is separate)', () => {
            const params = new URLSearchParams('level=sample&display=count')
            const state = getHierarchicalTableStateFromSearchParams(params)

            // Display mode is stored separately, not in column visibility
            expect(Object.keys(state.columnVisibility).length).toBe(0)
        })

        it('should return explicit column visibility from URL as delta', () => {
            // User explicitly set b_cell visible via cols param
            const params = new URLSearchParams('level=sample&display=percentage&cols={"b_cell":true}')
            const state = getHierarchicalTableStateFromSearchParams(params)

            // Only explicit override should be in delta
            expect(state.columnVisibility.b_cell).toBe(true)
            expect(Object.keys(state.columnVisibility).length).toBe(1)
        })

        it('should return empty delta for both mode (no explicit cols)', () => {
            const params = new URLSearchParams('level=sample&display=both')
            const state = getHierarchicalTableStateFromSearchParams(params)

            // Display mode is separate from column visibility delta
            expect(Object.keys(state.columnVisibility).length).toBe(0)
        })
    })

    describe('Level Changes', () => {
        const levels: HierarchyLevel[] = ['project', 'subject', 'sample', 'cell']

        levels.forEach((level) => {
            it(`should parse ${level} level correctly`, () => {
                const params = new URLSearchParams(`level=${level}`)
                const state = getHierarchicalTableStateFromSearchParams(params)

                expect(state.level).toBe(level)

                // All levels default to 'percentage'
                expect(state.displayMode).toBe('percentage')
            })
        })
    })

    describe('Empty URL (All Defaults)', () => {
        it('should load all defaults when URL is empty', () => {
            const params = new URLSearchParams()
            const state = getHierarchicalTableStateFromSearchParams(params)

            expect(state.level).toBe('sample')
            expect(state.aggregationMethod).toBe('mean')
            expect(state.displayMode).toBe('percentage')
            expect(state.sorting).toEqual([])
        })

        it('should produce clean URL when building with all defaults', () => {
            const current = new URLSearchParams()
            const next = buildHierarchicalTableSearchParams(current, {
                level: 'sample',
                aggregationMethod: 'mean',
                displayMode: 'percentage',
            })

            // All should be omitted as they match defaults
            expect(next.toString()).toBe('')
        })
    })
})
