'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Download, Share2, Plus, Minus, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MindMapNode {
  id: string
  label: string
  description?: string
  children?: MindMapNode[]
}

interface MindMapViewerProps {
  title: string
  nodes: MindMapNode[]
  onClose?: () => void
}

interface NodePosition {
  x: number
  y: number
  node: MindMapNode
  level: number
  angle: number
  parent?: NodePosition
}

// Color palette for different levels
const LEVEL_COLORS = [
  { bg: 'var(--accent-primary)', text: 'white' },
  { bg: '#10B981', text: 'white' },  // emerald
  { bg: '#8B5CF6', text: 'white' },  // violet
  { bg: '#F59E0B', text: 'white' },  // amber
  { bg: '#EC4899', text: 'white' },  // pink
  { bg: '#06B6D4', text: 'white' },  // cyan
]

export function MindMapViewer({ title, nodes, onClose }: MindMapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null)
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set())

  // Calculate node positions in a radial layout
  const calculatePositions = useCallback((): NodePosition[] => {
    const positions: NodePosition[] = []
    const centerX = 400
    const centerY = 300
    const baseRadius = 150

    // Process each main branch
    const angleStep = (2 * Math.PI) / Math.max(nodes.length, 1)

    nodes.forEach((node, index) => {
      const angle = angleStep * index - Math.PI / 2 // Start from top
      const x = centerX + Math.cos(angle) * baseRadius
      const y = centerY + Math.sin(angle) * baseRadius

      const nodePos: NodePosition = { x, y, node, level: 1, angle }
      positions.push(nodePos)

      // Process children if not collapsed
      if (node.children && !collapsedNodes.has(node.id)) {
        const childAngleSpread = Math.PI / 3 // 60 degrees spread
        const childRadius = 100

        node.children.forEach((child, childIndex) => {
          const childCount = node.children!.length
          const childAngleOffset = childAngleSpread * (childIndex - (childCount - 1) / 2) / Math.max(childCount - 1, 1)
          const childAngle = angle + childAngleOffset
          const childX = x + Math.cos(childAngle) * childRadius
          const childY = y + Math.sin(childAngle) * childRadius

          positions.push({
            x: childX,
            y: childY,
            node: child,
            level: 2,
            angle: childAngle,
            parent: nodePos
          })

          // Process grandchildren
          if (child.children && !collapsedNodes.has(child.id)) {
            const grandchildRadius = 70
            child.children.forEach((grandchild, gcIndex) => {
              const gcCount = child.children!.length
              const gcAngleOffset = (Math.PI / 4) * (gcIndex - (gcCount - 1) / 2) / Math.max(gcCount - 1, 1)
              const gcAngle = childAngle + gcAngleOffset
              const gcX = childX + Math.cos(gcAngle) * grandchildRadius
              const gcY = childY + Math.sin(gcAngle) * grandchildRadius

              positions.push({
                x: gcX,
                y: gcY,
                node: grandchild,
                level: 3,
                angle: gcAngle,
                parent: { x: childX, y: childY, node: child, level: 2, angle: childAngle }
              })
            })
          }
        })
      }
    })

    return positions
  }, [nodes, collapsedNodes])

  const nodePositions = calculatePositions()

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Zoom handlers
  const handleZoom = (delta: number) => {
    setScale(prev => Math.min(Math.max(prev + delta, 0.5), 2))
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    handleZoom(delta)
  }

  const resetView = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
    setCollapsedNodes(new Set())
  }

  const toggleCollapse = (nodeId: string) => {
    const newCollapsed = new Set(collapsedNodes)
    if (newCollapsed.has(nodeId)) {
      newCollapsed.delete(nodeId)
    } else {
      newCollapsed.add(nodeId)
    }
    setCollapsedNodes(newCollapsed)
  }

  const hasChildren = (node: MindMapNode) => node.children && node.children.length > 0

  if (!nodes || nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Share2 className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
        <p className="text-[var(--text-secondary)]">No mind map data available</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
            <Share2 className="h-5 w-5 text-cyan-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
            <p className="text-xs text-[var(--text-tertiary)]">{nodes.length} main concepts</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleZoom(-0.2)}
            className="h-8 w-8"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-[var(--text-tertiary)] w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleZoom(0.2)}
            className="h-8 w-8"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={resetView}
            className="h-8 w-8"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mind Map Canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden rounded-2xl bg-[var(--bg-tertiary)] border border-[rgba(255,255,255,0.1)] cursor-grab active:cursor-grabbing min-h-[400px]"
        style={{ height: 'calc(100vh - 300px)' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 800 600"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center'
          }}
        >
          {/* Connection Lines */}
          <g className="connections">
            {/* Lines from center to main nodes */}
            {nodePositions.filter(p => p.level === 1).map((pos, idx) => (
              <line
                key={`center-${pos.node.id}`}
                x1={400}
                y1={300}
                x2={pos.x}
                y2={pos.y}
                stroke={LEVEL_COLORS[idx % LEVEL_COLORS.length].bg}
                strokeWidth={3}
                strokeOpacity={0.6}
              />
            ))}

            {/* Lines from parent to child nodes */}
            {nodePositions.filter(p => p.parent).map(pos => (
              <line
                key={`line-${pos.node.id}`}
                x1={pos.parent!.x}
                y1={pos.parent!.y}
                x2={pos.x}
                y2={pos.y}
                stroke="var(--text-tertiary)"
                strokeWidth={2}
                strokeOpacity={0.4}
              />
            ))}
          </g>

          {/* Center Node (Title) */}
          <g
            className="center-node"
            style={{ cursor: 'pointer' }}
          >
            <circle
              cx={400}
              cy={300}
              r={50}
              fill="var(--accent-primary)"
              className="drop-shadow-lg"
            />
            <foreignObject x={350} y={280} width={100} height={40}>
              <div className="flex items-center justify-center h-full">
                <span className="text-white text-xs font-semibold text-center leading-tight px-2">
                  {title.length > 20 ? title.slice(0, 20) + '...' : title}
                </span>
              </div>
            </foreignObject>
          </g>

          {/* Main Nodes */}
          {nodePositions.map((pos, idx) => {
            const colorIdx = pos.level === 1 ? idx : (pos.parent ? nodePositions.findIndex(p => p.node.id === pos.parent?.node.id) : 0)
            const colors = LEVEL_COLORS[colorIdx % LEVEL_COLORS.length]
            const nodeSize = pos.level === 1 ? 40 : pos.level === 2 ? 30 : 24
            const fontSize = pos.level === 1 ? 11 : pos.level === 2 ? 10 : 9
            const isCollapsed = collapsedNodes.has(pos.node.id)
            const canCollapse = hasChildren(pos.node)

            return (
              <g
                key={pos.node.id}
                style={{ cursor: canCollapse ? 'pointer' : 'default' }}
                onClick={() => {
                  setSelectedNode(pos.node)
                  if (canCollapse) toggleCollapse(pos.node.id)
                }}
              >
                <motion.circle
                  cx={pos.x}
                  cy={pos.y}
                  r={nodeSize}
                  fill={pos.level === 1 ? colors.bg : 'var(--bg-surface)'}
                  stroke={colors.bg}
                  strokeWidth={pos.level === 1 ? 0 : 2}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.1 }}
                  className="drop-shadow-md"
                />

                {/* Collapse indicator */}
                {canCollapse && (
                  <circle
                    cx={pos.x + nodeSize - 5}
                    cy={pos.y - nodeSize + 5}
                    r={8}
                    fill="var(--bg-primary)"
                    stroke={colors.bg}
                    strokeWidth={1.5}
                  />
                )}
                {canCollapse && (
                  <text
                    x={pos.x + nodeSize - 5}
                    y={pos.y - nodeSize + 9}
                    textAnchor="middle"
                    fontSize={10}
                    fill={colors.bg}
                    fontWeight="bold"
                  >
                    {isCollapsed ? '+' : '−'}
                  </text>
                )}

                <foreignObject
                  x={pos.x - nodeSize}
                  y={pos.y - nodeSize / 2}
                  width={nodeSize * 2}
                  height={nodeSize}
                >
                  <div className="flex items-center justify-center h-full px-1">
                    <span
                      className="text-center leading-tight font-medium"
                      style={{
                        fontSize: `${fontSize}px`,
                        color: pos.level === 1 ? colors.text : 'var(--text-primary)'
                      }}
                    >
                      {pos.node.label.length > 15 ? pos.node.label.slice(0, 15) + '...' : pos.node.label}
                    </span>
                  </div>
                </foreignObject>
              </g>
            )
          })}
        </svg>

        {/* Instructions */}
        <div className="absolute bottom-4 left-4 text-xs text-[var(--text-tertiary)] bg-[var(--bg-primary)]/80 px-3 py-2 rounded-lg backdrop-blur-sm">
          Drag to pan • Scroll to zoom • Click nodes to expand/collapse
        </div>

        {/* Floating Zoom Sidebar */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 bg-[var(--bg-primary)]/90 backdrop-blur-sm rounded-xl p-1.5 border border-[rgba(255,255,255,0.1)] shadow-lg">
          <button
            onClick={() => handleZoom(0.2)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            title="Zoom in"
          >
            <Plus className="h-5 w-5" />
          </button>
          <div className="text-[10px] text-center text-[var(--text-tertiary)] py-1 font-medium">
            {Math.round(scale * 100)}%
          </div>
          <button
            onClick={() => handleZoom(-0.2)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            title="Zoom out"
          >
            <Minus className="h-5 w-5" />
          </button>
          <div className="h-px bg-[rgba(255,255,255,0.1)] my-1" />
          <button
            onClick={resetView}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            title="Reset view"
          >
            <Home className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Selected Node Detail */}
      {selectedNode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[rgba(255,255,255,0.1)]"
        >
          <h3 className="font-semibold text-[var(--text-primary)] mb-1">{selectedNode.label}</h3>
          {selectedNode.description && (
            <p className="text-sm text-[var(--text-secondary)]">{selectedNode.description}</p>
          )}
          {selectedNode.children && selectedNode.children.length > 0 && (
            <p className="text-xs text-[var(--text-tertiary)] mt-2">
              {selectedNode.children.length} sub-concept{selectedNode.children.length > 1 ? 's' : ''}
            </p>
          )}
        </motion.div>
      )}
    </div>
  )
}
