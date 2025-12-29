'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, ChevronDown, Copy, Check, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface FAQItem {
  question: string
  answer: string
}

interface FAQViewerProps {
  items: FAQItem[]
  onClose?: () => void
}

export function FAQViewer({ items, onClose }: FAQViewerProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const filteredItems = items.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const copyAnswer = async (index: number, answer: string) => {
    await navigator.clipboard.writeText(answer)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <HelpCircle className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
        <p className="text-[var(--text-secondary)]">No FAQ items available</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center">
            <HelpCircle className="h-6 w-6 text-teal-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Frequently Asked Questions</h2>
            <p className="text-sm text-[var(--text-tertiary)]">{items.length} questions from your sources</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <Input
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-[var(--bg-tertiary)] border-[rgba(255,255,255,0.1)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] rounded-xl"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* FAQ List */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[var(--text-tertiary)]">No matching questions found</p>
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            const originalIndex = items.indexOf(item)
            const isExpanded = expandedIndex === originalIndex

            return (
              <motion.div
                key={originalIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`
                  rounded-xl border overflow-hidden transition-colors
                  ${isExpanded
                    ? 'bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-surface)] border-[var(--accent-primary)]/30'
                    : 'bg-[var(--bg-secondary)] border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)]'
                  }
                `}
              >
                {/* Question Header */}
                <button
                  onClick={() => setExpandedIndex(isExpanded ? null : originalIndex)}
                  className="w-full flex items-start gap-4 p-4 text-left"
                >
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5
                    ${isExpanded
                      ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
                    }
                  `}>
                    <span className="text-sm font-bold">Q</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`
                      font-medium leading-relaxed
                      ${isExpanded ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}
                    `}>
                      {item.question}
                    </p>
                  </div>
                  <ChevronDown
                    className={`
                      h-5 w-5 text-[var(--text-tertiary)] flex-shrink-0 transition-transform mt-0.5
                      ${isExpanded ? 'rotate-180' : ''}
                    `}
                  />
                </button>

                {/* Answer Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4">
                        <div className="flex gap-4">
                          <div className="w-8 h-8 rounded-lg bg-[var(--accent-secondary)]/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-[var(--accent-secondary)]">A</span>
                          </div>
                          <div className="flex-1 space-y-3">
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                              {item.answer}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                copyAnswer(originalIndex, item.answer)
                              }}
                              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] -ml-2"
                            >
                              {copiedIndex === originalIndex ? (
                                <>
                                  <Check className="h-3.5 w-3.5 mr-1.5 text-[var(--success)]" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                                  Copy answer
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Quick Jump */}
      {items.length > 5 && !searchQuery && (
        <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.1)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-2">Quick jump</p>
          <div className="flex flex-wrap gap-1.5">
            {items.slice(0, 8).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setExpandedIndex(idx)}
                className={`
                  w-7 h-7 rounded-lg text-xs font-medium transition-colors
                  ${expandedIndex === idx
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                  }
                `}
              >
                {idx + 1}
              </button>
            ))}
            {items.length > 8 && (
              <span className="flex items-center text-xs text-[var(--text-tertiary)] px-2">
                +{items.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Expand All / Collapse All */}
      <div className="flex justify-center gap-4 mt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpandedIndex(0)}
          className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        >
          Collapse All
        </Button>
      </div>
    </div>
  )
}
