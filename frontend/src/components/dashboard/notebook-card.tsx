'use client'

import { motion } from 'framer-motion'
import { MoreHorizontal, Trash2, Edit2, Copy, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

interface NotebookCardProps {
  id: string
  emoji: string
  name: string
  sourceCount: number
  description?: string | null
  lastEdited?: string
  isFeatured?: boolean
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  onDuplicate?: (id: string) => void
  onRename?: (id: string) => void
  onToggleFeatured?: (id: string) => void
}

export function NotebookCard({
  id,
  emoji,
  name,
  sourceCount,
  description,
  lastEdited,
  isFeatured,
  onOpen,
  onDelete,
  onDuplicate,
  onRename,
  onToggleFeatured,
}: NotebookCardProps) {
  const CardContent = () => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="group relative bg-[var(--bg-secondary)] border border-[rgba(255,255,255,0.1)] rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:border-[rgba(255,255,255,0.15)] hover:shadow-lg"
      onClick={() => onOpen(id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-2xl">
            {emoji}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-base truncate text-[var(--text-primary)]">{name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-[var(--text-tertiary)]">
                {sourceCount} source{sourceCount !== 1 ? 's' : ''}
              </span>
              {isFeatured && (
                <Badge className="bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border-0 text-xs py-0 h-5">
                  Featured
                </Badge>
              )}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4 text-[var(--text-secondary)]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-[var(--bg-secondary)] border-[rgba(255,255,255,0.1)]">
            {onRename && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(id); }} className="cursor-pointer">
                <Edit2 className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
            )}
            {onDuplicate && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(id); }} className="cursor-pointer">
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
            )}
            {onToggleFeatured && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleFeatured(id); }} className="cursor-pointer">
                <Star className={`h-4 w-4 mr-2 ${isFeatured ? 'fill-[var(--accent-primary)] text-[var(--accent-primary)]' : ''}`} />
                {isFeatured ? 'Remove from Featured' : 'Add to Featured'}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-[rgba(255,255,255,0.1)]" />
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onDelete(id); }}
              className="cursor-pointer text-[var(--error)] focus:text-[var(--error)]"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Description */}
      {description && (
        <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-4">
          {description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
        <span>
          {lastEdited ? `Edited ${lastEdited}` : 'Never edited'}
        </span>
      </div>
    </motion.div>
  )

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <CardContent />
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48 bg-[var(--bg-secondary)] border-[rgba(255,255,255,0.1)]">
        <ContextMenuItem onClick={() => onOpen(id)} className="cursor-pointer">
          Open Notebook
        </ContextMenuItem>
        {onRename && (
          <ContextMenuItem onClick={() => onRename(id)} className="cursor-pointer">
            <Edit2 className="h-4 w-4 mr-2" />
            Rename
          </ContextMenuItem>
        )}
        {onDuplicate && (
          <ContextMenuItem onClick={() => onDuplicate(id)} className="cursor-pointer">
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </ContextMenuItem>
        )}
        {onToggleFeatured && (
          <ContextMenuItem onClick={() => onToggleFeatured(id)} className="cursor-pointer">
            <Star className={`h-4 w-4 mr-2 ${isFeatured ? 'fill-[var(--accent-primary)] text-[var(--accent-primary)]' : ''}`} />
            {isFeatured ? 'Remove from Featured' : 'Add to Featured'}
          </ContextMenuItem>
        )}
        <ContextMenuSeparator className="bg-[rgba(255,255,255,0.1)]" />
        <ContextMenuItem
          onClick={() => onDelete(id)}
          className="cursor-pointer text-[var(--error)] focus:text-[var(--error)]"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export function CreateNotebookCard({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative bg-[var(--bg-secondary)] border-2 border-dashed border-[rgba(255,255,255,0.15)] rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:border-[var(--accent-primary)]/50 hover:bg-[var(--bg-tertiary)]/30 flex flex-col items-center justify-center min-h-[180px]"
    >
      <div className="w-14 h-14 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center mb-3">
        <span className="text-3xl">+</span>
      </div>
      <h3 className="font-semibold text-base text-[var(--text-primary)]">Create New</h3>
      <p className="text-sm text-[var(--text-tertiary)] mt-1">Start a new research notebook</p>
    </motion.div>
  )
}
