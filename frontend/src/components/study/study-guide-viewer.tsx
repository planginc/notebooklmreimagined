'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, ChevronRight, BookOpen, List, Bookmark, Copy, Check, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { exportStudyGuideToPDF, generateFilename } from '@/lib/export-utils'

interface StudyGuideSection {
  heading: string
  content: string
}

interface StudyGuide {
  title: string
  sections: StudyGuideSection[]
}

interface StudyGuideViewerProps {
  guide: StudyGuide
  onClose?: () => void
}

// Parse inline markdown (bold, italic, code)
function parseInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  // Pattern to match **bold**, *italic*, `code`, and plain text
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g
  let lastIndex = 0
  let match

  while ((match = pattern.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>)
    }

    const matched = match[0]
    if (matched.startsWith('**') && matched.endsWith('**')) {
      // Bold
      parts.push(
        <strong key={key++} className="font-semibold text-[var(--text-primary)]">
          {matched.slice(2, -2)}
        </strong>
      )
    } else if (matched.startsWith('*') && matched.endsWith('*')) {
      // Italic
      parts.push(
        <em key={key++} className="italic">
          {matched.slice(1, -1)}
        </em>
      )
    } else if (matched.startsWith('`') && matched.endsWith('`')) {
      // Inline code
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--accent-primary)] font-mono text-sm">
          {matched.slice(1, -1)}
        </code>
      )
    }

    lastIndex = pattern.lastIndex
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>)
  }

  return parts.length > 0 ? parts : [<span key={0}>{text}</span>]
}

export function StudyGuideViewer({ guide, onClose }: StudyGuideViewerProps) {
  const [activeSection, setActiveSection] = useState(0)
  const [showTOC, setShowTOC] = useState(true)
  const [copied, setCopied] = useState(false)
  const [bookmarkedSections, setBookmarkedSections] = useState<Set<number>>(new Set())
  const [isExporting, setIsExporting] = useState(false)

  // Export handler
  const handleExportPDF = async () => {
    setIsExporting(true)
    try {
      await exportStudyGuideToPDF(guide, generateFilename('study-guide'))
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const toggleBookmark = (idx: number) => {
    const newBookmarks = new Set(bookmarkedSections)
    if (newBookmarks.has(idx)) {
      newBookmarks.delete(idx)
    } else {
      newBookmarks.add(idx)
    }
    setBookmarkedSections(newBookmarks)
  }

  const copyGuide = async () => {
    const text = `# ${guide.title}\n\n${guide.sections.map(s => `## ${s.heading}\n\n${s.content}`).join('\n\n')}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!guide || !guide.sections || guide.sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
        <p className="text-[var(--text-secondary)]">No study guide available</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center">
              <FileText className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">{guide.title}</h2>
              <p className="text-sm text-[var(--text-tertiary)]">{guide.sections.length} sections</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyGuide}
              className="text-[var(--text-secondary)]"
            >
              {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportPDF}
              disabled={isExporting}
              className="text-[var(--text-secondary)]"
            >
              <Download className="h-4 w-4 mr-1.5" />
              {isExporting ? 'Exporting...' : 'PDF'}
            </Button>
          </div>
        </div>

        {/* Table of Contents Toggle */}
        <button
          onClick={() => setShowTOC(!showTOC)}
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <List className="h-4 w-4" />
          Table of Contents
          <ChevronRight className={`h-4 w-4 transition-transform ${showTOC ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {/* Table of Contents */}
      {showTOC && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="mb-6 overflow-hidden"
        >
          <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[rgba(255,255,255,0.1)]">
            <div className="space-y-1">
              {guide.sections.map((section, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveSection(idx)
                    setShowTOC(false)
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                    ${activeSection === idx
                      ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                    }
                  `}
                >
                  <span className="w-6 h-6 rounded-md bg-[var(--bg-surface)] flex items-center justify-center text-xs font-medium">
                    {idx + 1}
                  </span>
                  <span className="flex-1 truncate text-sm">{section.heading}</span>
                  {bookmarkedSections.has(idx) && (
                    <Bookmark className="h-4 w-4 text-[var(--warning)] fill-[var(--warning)]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Section Navigation Pills */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        {guide.sections.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveSection(idx)}
            className={`
              flex-shrink-0 w-8 h-8 rounded-lg text-sm font-medium transition-all
              ${activeSection === idx
                ? 'bg-[var(--accent-primary)] text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
              }
            `}
          >
            {idx + 1}
          </button>
        ))}
      </div>

      {/* Section Content */}
      <ScrollArea className="flex-1 -mx-1 px-1">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-surface)] border border-[rgba(255,255,255,0.1)]">
            {/* Section Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/20 flex items-center justify-center text-sm font-bold text-[var(--accent-primary)]">
                  {activeSection + 1}
                </span>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {guide.sections[activeSection]?.heading}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleBookmark(activeSection)}
                className={`h-8 w-8 ${bookmarkedSections.has(activeSection) ? 'text-[var(--warning)]' : 'text-[var(--text-tertiary)]'}`}
              >
                <Bookmark className={`h-4 w-4 ${bookmarkedSections.has(activeSection) ? 'fill-current' : ''}`} />
              </Button>
            </div>

            {/* Section Content */}
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="text-[var(--text-secondary)] leading-relaxed">
                {guide.sections[activeSection]?.content.split('\n').map((paragraph, idx) => {
                  // Format numbered lists
                  if (/^\d+\.\s/.test(paragraph)) {
                    return (
                      <div key={idx} className="flex gap-3 my-2">
                        <span className="text-[var(--accent-primary)] font-medium flex-shrink-0">
                          {paragraph.match(/^\d+/)?.[0]}.
                        </span>
                        <span>{parseInlineMarkdown(paragraph.replace(/^\d+\.\s/, ''))}</span>
                      </div>
                    )
                  }
                  // Format bullet points
                  if (/^[-•]\s/.test(paragraph)) {
                    return (
                      <div key={idx} className="flex gap-3 my-2 ml-4">
                        <span className="text-[var(--accent-secondary)] flex-shrink-0">•</span>
                        <span>{parseInlineMarkdown(paragraph.replace(/^[-•]\s/, ''))}</span>
                      </div>
                    )
                  }
                  // Regular paragraph
                  if (paragraph.trim()) {
                    return <p key={idx} className="my-3">{parseInlineMarkdown(paragraph)}</p>
                  }
                  return null
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </ScrollArea>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-[rgba(255,255,255,0.1)]">
        <Button
          variant="outline"
          disabled={activeSection === 0}
          onClick={() => setActiveSection(activeSection - 1)}
          className="rounded-xl border-[rgba(255,255,255,0.1)]"
        >
          Previous
        </Button>

        <span className="text-sm text-[var(--text-tertiary)]">
          {activeSection + 1} / {guide.sections.length}
        </span>

        <Button
          variant="outline"
          disabled={activeSection === guide.sections.length - 1}
          onClick={() => setActiveSection(activeSection + 1)}
          className="rounded-xl border-[rgba(255,255,255,0.1)]"
        >
          Next
        </Button>
      </div>

      {/* Bookmarks Summary */}
      {bookmarkedSections.size > 0 && (
        <div className="mt-4 p-3 rounded-xl bg-[var(--warning)]/10 border border-[var(--warning)]/30">
          <div className="flex items-center gap-2 text-sm">
            <Bookmark className="h-4 w-4 text-[var(--warning)] fill-[var(--warning)]" />
            <span className="text-[var(--warning)]">
              {bookmarkedSections.size} section{bookmarkedSections.size > 1 ? 's' : ''} bookmarked
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
