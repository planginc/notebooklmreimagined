'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  History,
  RefreshCw,
  Filter,
  Loader2,
  Mic,
  Video,
  Search,
  Table2,
  FileText,
  Presentation,
  Image,
  Layers,
  HelpCircle,
  BookOpen,
  MessageCircleQuestion,
  Network,
  StickyNote,
  Clock,
  Grid3X3,
  List
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import type { HistoryItem, HistoryItemType } from '@/app/api/notebooks/[id]/history/route'

// Type configuration
const typeConfig: Record<HistoryItemType, {
  icon: React.ElementType
  label: string
  gradient: string
  badgeColor: string
  bgColor: string
}> = {
  audio: {
    icon: Mic,
    label: 'Audio',
    gradient: 'from-orange-500/20 to-amber-500/20',
    badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    bgColor: 'bg-orange-500/10'
  },
  video: {
    icon: Video,
    label: 'Video',
    gradient: 'from-purple-500/20 to-violet-500/20',
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    bgColor: 'bg-purple-500/10'
  },
  research: {
    icon: Search,
    label: 'Research',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    bgColor: 'bg-blue-500/10'
  },
  data_table: {
    icon: Table2,
    label: 'Table',
    gradient: 'from-emerald-500/20 to-green-500/20',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    bgColor: 'bg-emerald-500/10'
  },
  report: {
    icon: FileText,
    label: 'Report',
    gradient: 'from-blue-500/20 to-indigo-500/20',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    bgColor: 'bg-blue-500/10'
  },
  slide_deck: {
    icon: Presentation,
    label: 'Slides',
    gradient: 'from-violet-500/20 to-purple-500/20',
    badgeColor: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    bgColor: 'bg-violet-500/10'
  },
  infographic: {
    icon: Image,
    label: 'Infographic',
    gradient: 'from-rose-500/20 to-pink-500/20',
    badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    bgColor: 'bg-rose-500/10'
  },
  flashcards: {
    icon: Layers,
    label: 'Flashcards',
    gradient: 'from-blue-500/20 to-sky-500/20',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    bgColor: 'bg-blue-500/10'
  },
  quiz: {
    icon: HelpCircle,
    label: 'Quiz',
    gradient: 'from-purple-500/20 to-fuchsia-500/20',
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    bgColor: 'bg-purple-500/10'
  },
  study_guide: {
    icon: BookOpen,
    label: 'Study Guide',
    gradient: 'from-orange-500/20 to-yellow-500/20',
    badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    bgColor: 'bg-orange-500/10'
  },
  faq: {
    icon: MessageCircleQuestion,
    label: 'FAQ',
    gradient: 'from-teal-500/20 to-emerald-500/20',
    badgeColor: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    bgColor: 'bg-teal-500/10'
  },
  mind_map: {
    icon: Network,
    label: 'Mind Map',
    gradient: 'from-cyan-500/20 to-blue-500/20',
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    bgColor: 'bg-cyan-500/10'
  },
  note: {
    icon: StickyNote,
    label: 'Note',
    gradient: 'from-amber-500/20 to-yellow-500/20',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    bgColor: 'bg-amber-500/10'
  }
}

const typeLabels: Record<HistoryItemType, string> = {
  audio: 'Audio',
  video: 'Video',
  research: 'Research',
  data_table: 'Data Table',
  report: 'Report',
  slide_deck: 'Slides',
  infographic: 'Infographic',
  flashcards: 'Flashcards',
  quiz: 'Quiz',
  study_guide: 'Study Guide',
  faq: 'FAQ',
  mind_map: 'Mind Map',
  note: 'Notes'
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function formatFullDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getPreviewText(type: HistoryItemType, preview: Record<string, unknown>): string {
  switch (type) {
    case 'audio':
      const duration = preview.duration_seconds as number
      return duration ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')} duration` : 'Audio overview'
    case 'video':
      const videoDuration = preview.duration_seconds as number
      return videoDuration ? `${videoDuration}s • ${preview.style || 'video'}` : 'Video overview'
    case 'research':
      return preview.query as string || 'Research report'
    case 'data_table':
      return `${preview.row_count || 0} rows × ${preview.column_count || 0} columns`
    case 'report':
      return `${preview.report_type || 'Report'} • ${preview.section_count || 0} sections`
    case 'slide_deck':
      return `${preview.slide_count || 0} slides`
    case 'infographic':
      return `${preview.image_count || 0} images`
    case 'flashcards':
      return `${preview.card_count || 0} cards`
    case 'quiz':
      return `${preview.question_count || 0} questions`
    case 'study_guide':
      return `${preview.section_count || 0} sections`
    case 'faq':
      return `${preview.item_count || 0} items`
    case 'mind_map':
      return `${preview.node_count || 0} nodes`
    case 'note':
      return (preview.content_preview as string)?.slice(0, 60) || 'Note'
    default:
      return ''
  }
}

interface HistoryCardProps {
  item: HistoryItem
  onClick: () => void
  viewMode: 'grid' | 'list'
}

function HistoryCard({ item, onClick, viewMode }: HistoryCardProps) {
  const config = typeConfig[item.type] || typeConfig.note
  const Icon = config.icon
  const previewText = getPreviewText(item.type, item.preview)
  const isProcessing = item.status === 'processing'
  const timeAgo = formatTimeAgo(item.created_at)
  const fullDate = formatFullDate(item.created_at)

  if (viewMode === 'list') {
    return (
      <button
        onClick={onClick}
        className={cn(
          'w-full text-left p-4 rounded-xl border border-[rgba(255,255,255,0.06)]',
          'bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]',
          'transition-all duration-200 group',
          'focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50'
        )}
      >
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
            `bg-gradient-to-br ${config.gradient}`
          )}>
            {isProcessing ? (
              <Loader2 className="h-5 w-5 text-[var(--text-secondary)] animate-spin" />
            ) : (
              <Icon className="h-5 w-5 text-[var(--text-secondary)]" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base font-medium text-[var(--text-primary)] truncate">
                {item.title}
              </span>
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full border flex-shrink-0',
                config.badgeColor
              )}>
                {config.label}
              </span>
            </div>
            <p className="text-sm text-[var(--text-tertiary)]">
              {previewText}
            </p>
          </div>

          {/* Timestamp */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] flex-shrink-0">
                <Clock className="h-3.5 w-3.5" />
                <span>{timeAgo}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{fullDate}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </button>
    )
  }

  // Grid view
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-5 rounded-xl border border-[rgba(255,255,255,0.06)]',
        'bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]',
        'transition-all duration-200 group h-full',
        'focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50'
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center',
            `bg-gradient-to-br ${config.gradient}`
          )}>
            {isProcessing ? (
              <Loader2 className="h-5 w-5 text-[var(--text-secondary)] animate-spin" />
            ) : (
              <Icon className="h-5 w-5 text-[var(--text-secondary)]" />
            )}
          </div>
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full border',
            config.badgeColor
          )}>
            {config.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-medium text-[var(--text-primary)] mb-1 line-clamp-2">
          {item.title}
        </h3>

        {/* Preview */}
        <p className="text-sm text-[var(--text-tertiary)] mb-3 line-clamp-2 flex-1">
          {previewText}
        </p>

        {/* Timestamp */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
              <Clock className="h-3.5 w-3.5" />
              <span>{timeAgo}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{fullDate}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </button>
  )
}

export default function HistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: notebookId } = use(params)
  const router = useRouter()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterTypes, setFilterTypes] = useState<HistoryItemType[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [notebookTitle, setNotebookTitle] = useState<string>('')

  const fetchHistory = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      // Fetch notebook title
      const { data: notebook } = await supabase
        .from('notebooks')
        .select('title')
        .eq('id', notebookId)
        .single()

      if (notebook) {
        setNotebookTitle(notebook.title)
      }

      const params = new URLSearchParams({
        limit: '100',
        offset: '0'
      })

      if (filterTypes.length > 0) {
        params.set('types', filterTypes.join(','))
      }

      const response = await fetch(`/api/notebooks/${notebookId}/history?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch history')
      }

      const result = await response.json()
      setItems(result.data || [])
      setTotal(result.total || 0)
    } catch (err) {
      console.error('Fetch history error:', err)
      setError('Failed to load history')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [notebookId, filterTypes])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const toggleFilter = (type: HistoryItemType) => {
    setFilterTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  const clearFilters = () => {
    setFilterTypes([])
  }

  const handleItemClick = (item: HistoryItem) => {
    // Navigate back to notebook with item info in query params
    const typeMap: Record<string, string> = {
      audio: 'audio',
      video: 'video',
      research: 'research',
      data_table: 'datatable',
      report: 'report',
      slide_deck: 'slides',
      infographic: 'infographic',
      flashcards: 'flashcards',
      quiz: 'quiz',
      study_guide: 'guide',
      faq: 'faq',
      mind_map: 'mindmap',
      note: 'notes',
    }
    const studyType = typeMap[item.type]
    if (studyType) {
      router.push(`/notebooks/${notebookId}?view=${studyType}&itemId=${item.id}`)
    }
  }

  // Group items by date
  const groupedItems = items.reduce((groups, item) => {
    const date = new Date(item.created_at)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let groupKey: string
    if (date.toDateString() === today.toDateString()) {
      groupKey = 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'Yesterday'
    } else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
      groupKey = 'This Week'
    } else if (date > new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)) {
      groupKey = 'This Month'
    } else {
      groupKey = 'Older'
    }

    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(item)
    return groups
  }, {} as Record<string, HistoryItem[]>)

  const groupOrder = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older']

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[rgba(255,255,255,0.06)]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(`/notebooks/${notebookId}`)}
                className="h-10 w-10 rounded-xl"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <History className="h-5 w-5 text-[var(--accent-primary)]" />
                  Content History
                </h1>
                {notebookTitle && (
                  <p className="text-sm text-[var(--text-tertiary)]">{notebookTitle}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex items-center bg-[var(--bg-secondary)] rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'h-8 w-8 rounded-md',
                    viewMode === 'grid' && 'bg-[var(--bg-tertiary)]'
                  )}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'h-8 w-8 rounded-md',
                    viewMode === 'list' && 'bg-[var(--bg-tertiary)]'
                  )}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              {/* Filter dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'h-10 px-3 rounded-xl',
                      filterTypes.length > 0 && 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                    )}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                    {filterTypes.length > 0 && (
                      <span className="ml-1.5 bg-[var(--accent-primary)] text-white text-xs px-1.5 py-0.5 rounded-full">
                        {filterTypes.length}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {(Object.keys(typeLabels) as HistoryItemType[]).map(type => (
                    <DropdownMenuCheckboxItem
                      key={type}
                      checked={filterTypes.includes(type)}
                      onCheckedChange={() => toggleFilter(type)}
                    >
                      {typeLabels[type]}
                    </DropdownMenuCheckboxItem>
                  ))}
                  {filterTypes.length > 0 && (
                    <DropdownMenuCheckboxItem
                      checked={false}
                      onCheckedChange={clearFilters}
                      className="text-[var(--text-tertiary)] border-t border-[rgba(255,255,255,0.06)] mt-1 pt-1"
                    >
                      Clear all filters
                    </DropdownMenuCheckboxItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Refresh button */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchHistory(true)}
                disabled={isRefreshing}
                className="h-10 w-10 rounded-xl"
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              </Button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-4 mt-4 text-sm text-[var(--text-tertiary)]">
            <span>
              {filterTypes.length > 0
                ? `Showing ${items.length} of ${total} items`
                : `${total} total items`}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-[var(--text-tertiary)] animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-base text-[var(--text-tertiary)] mb-4">{error}</p>
            <Button
              variant="outline"
              onClick={() => fetchHistory()}
              className="rounded-xl"
            >
              Try again
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center mb-4">
              <History className="h-8 w-8 text-[var(--text-tertiary)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              {filterTypes.length > 0 ? 'No items match your filters' : 'No content yet'}
            </h3>
            <p className="text-sm text-[var(--text-tertiary)] max-w-md">
              {filterTypes.length > 0
                ? 'Try removing some filters to see more content'
                : 'Generate audio, video, study materials, or other content to see them here'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupOrder.map(group => {
              const groupItems = groupedItems[group]
              if (!groupItems || groupItems.length === 0) return null

              return (
                <div key={group}>
                  <h2 className="text-sm font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-4">
                    {group}
                  </h2>
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {groupItems.map(item => (
                        <HistoryCard
                          key={`${item.type}-${item.id}`}
                          item={item}
                          onClick={() => handleItemClick(item)}
                          viewMode={viewMode}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {groupItems.map(item => (
                        <HistoryCard
                          key={`${item.type}-${item.id}`}
                          item={item}
                          onClick={() => handleItemClick(item)}
                          viewMode={viewMode}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
