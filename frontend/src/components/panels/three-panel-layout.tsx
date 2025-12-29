'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PanelLeftOpen, PanelRightOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ThreePanelLayoutProps {
  leftPanel: React.ReactNode
  centerPanel: React.ReactNode
  rightPanel: React.ReactNode
  leftPanelTitle?: string
  rightPanelTitle?: string
  defaultLeftWidth?: number
  defaultRightWidth?: number
  minLeftWidth?: number
  minRightWidth?: number
  maxLeftWidth?: number
  maxRightWidth?: number
}

export function ThreePanelLayout({
  leftPanel,
  centerPanel,
  rightPanel,
  leftPanelTitle = 'Sources',
  rightPanelTitle = 'Studio',
  defaultLeftWidth = 280,
  defaultRightWidth = 340,
  minLeftWidth = 200,
  minRightWidth = 280,
  maxLeftWidth = 400,
  maxRightWidth = 480,
}: ThreePanelLayoutProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth)
  const [rightWidth, setRightWidth] = useState(defaultRightWidth)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [isResizingLeft, setIsResizingLeft] = useState(false)
  const [isResizingRight, setIsResizingRight] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()

      if (isResizingLeft) {
        const newWidth = e.clientX - containerRect.left
        if (newWidth >= minLeftWidth && newWidth <= maxLeftWidth) {
          setLeftWidth(newWidth)
        }
      }

      if (isResizingRight) {
        const newWidth = containerRect.right - e.clientX
        if (newWidth >= minRightWidth && newWidth <= maxRightWidth) {
          setRightWidth(newWidth)
        }
      }
    },
    [isResizingLeft, isResizingRight, minLeftWidth, maxLeftWidth, minRightWidth, maxRightWidth]
  )

  const handleMouseUp = useCallback(() => {
    setIsResizingLeft(false)
    setIsResizingRight(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  useEffect(() => {
    if (isResizingLeft || isResizingRight) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizingLeft, isResizingRight, handleMouseMove, handleMouseUp])

  return (
    <div ref={containerRef} className="flex h-full overflow-hidden">
      {/* Left Panel */}
      <AnimatePresence initial={false}>
        {leftCollapsed ? (
          <motion.div
            initial={{ width: leftWidth }}
            animate={{ width: 48 }}
            exit={{ width: leftWidth }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="h-full bg-[var(--bg-secondary)] border-r border-[rgba(255,255,255,0.1)] flex flex-col items-center py-4"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLeftCollapsed(false)}
              className="h-8 w-8 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ width: 48 }}
            animate={{ width: leftWidth }}
            exit={{ width: 48 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="h-full bg-[var(--bg-secondary)] border-r border-[rgba(255,255,255,0.1)] flex flex-col"
            style={{ minWidth: minLeftWidth }}
          >
            {/* Panel Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] shrink-0">
              <h2 className="font-semibold text-[var(--text-primary)]">{leftPanelTitle}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLeftCollapsed(true)}
                className="h-8 w-8 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
              >
                <PanelLeftOpen className="h-4 w-4 rotate-180" />
              </Button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-hidden">
              {leftPanel}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Resize Handle */}
      {!leftCollapsed && (
        <div
          className="w-1 bg-transparent hover:bg-[var(--accent-primary)]/50 cursor-col-resize transition-colors shrink-0"
          onMouseDown={() => setIsResizingLeft(true)}
        />
      )}

      {/* Center Panel */}
      <div className="flex-1 min-w-0 h-full flex flex-col bg-[var(--bg-primary)] overflow-hidden">
        {centerPanel}
      </div>

      {/* Right Resize Handle */}
      {!rightCollapsed && (
        <div
          className="w-1 bg-transparent hover:bg-[var(--accent-primary)]/50 cursor-col-resize transition-colors shrink-0"
          onMouseDown={() => setIsResizingRight(true)}
        />
      )}

      {/* Right Panel */}
      <AnimatePresence initial={false}>
        {rightCollapsed ? (
          <motion.div
            initial={{ width: rightWidth }}
            animate={{ width: 48 }}
            exit={{ width: rightWidth }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="h-full bg-[var(--bg-secondary)] border-l border-[rgba(255,255,255,0.1)] flex flex-col items-center py-4"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRightCollapsed(false)}
              className="h-8 w-8 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
            >
              <PanelRightOpen className="h-4 w-4" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ width: 48 }}
            animate={{ width: rightWidth }}
            exit={{ width: 48 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="h-full bg-[var(--bg-secondary)] border-l border-[rgba(255,255,255,0.1)] flex flex-col"
            style={{ minWidth: minRightWidth }}
          >
            {/* Panel Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] shrink-0">
              <h2 className="font-semibold text-[var(--text-primary)]">{rightPanelTitle}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRightCollapsed(true)}
                className="h-8 w-8 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
              >
                <PanelRightOpen className="h-4 w-4 rotate-180" />
              </Button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-hidden">
              {rightPanel}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
