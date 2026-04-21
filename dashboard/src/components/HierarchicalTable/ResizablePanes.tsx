import { useState, useRef, useEffect, memo } from "react"

type ResizablePanesProps = {
    leftPane: React.ReactNode
    rightPane: React.ReactNode
    leftWidth: number
    onLeftWidthChange: (width: number) => void
}

const ResizablePanes = memo(function ResizablePanes({
    leftPane,
    rightPane,
    leftWidth,
    onLeftWidthChange
}: ResizablePanesProps) {
    const [isDragging, setIsDragging] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const leftPaneRef = useRef<HTMLDivElement>(null)
    const rightPaneRef = useRef<HTMLDivElement>(null)
    const currentWidthRef = useRef(leftWidth)

    const handleMouseDown = () => setIsDragging(true)

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !containerRef.current || !leftPaneRef.current || !rightPaneRef.current) return

            const containerRect = containerRef.current.getBoundingClientRect()
            const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100

            // Clamp between 20-80% to prevent collapse
            const clampedWidth = Math.max(20, Math.min(80, newLeftWidth))
            const roundedWidth = Math.round(clampedWidth)

            // Direct DOM manipulation for instant visual feedback (no React re-render)
            leftPaneRef.current.style.width = `${roundedWidth}%`
            rightPaneRef.current.style.width = `${100 - roundedWidth}%`

            currentWidthRef.current = roundedWidth
        }

        const handleMouseUp = () => {
            if (isDragging) {
                // Only update React state (and potentially URL) on mouse up
                onLeftWidthChange(currentWidthRef.current)
                setIsDragging(false)
            }
        }

        if (isDragging) {
            document.addEventListener("mousemove", handleMouseMove)
            document.addEventListener("mouseup", handleMouseUp)
            return () => {
                document.removeEventListener("mousemove", handleMouseMove)
                document.removeEventListener("mouseup", handleMouseUp)
            }
        }
    }, [isDragging, onLeftWidthChange])

    return (
        <div ref={containerRef} className="flex h-full">
            <div
                ref={leftPaneRef}
                style={{ width: `${leftWidth}%` }}
                className="overflow-auto"
            >
                {leftPane}
            </div>
            <div
                onMouseDown={handleMouseDown}
                className={`w-1 bg-slate-300 cursor-col-resize flex-shrink-0 ${isDragging ? 'bg-blue-500' : 'hover:bg-blue-400'
                    }`}
                title="Drag to resize"
            />
            <div
                ref={rightPaneRef}
                style={{ width: `${100 - leftWidth}%` }}
                className="overflow-auto bg-slate-50"
            >
                {rightPane}
            </div>
        </div>
    )
})

export default ResizablePanes
