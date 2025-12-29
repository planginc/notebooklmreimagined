'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Sparkles, Copy, StickyNote, AlertCircle, ChevronDown, MessageSquare, Plus, Trash2, Clock, ExternalLink, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChatMessage, Citation } from '@/lib/supabase'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChatSession {
  id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
}

interface ChatPanelProps {
  messages: ChatMessage[]
  message: string
  onMessageChange: (message: string) => void
  onSendMessage: (overrideMessage?: string) => void
  sending: boolean
  selectedSourcesCount: number
  totalSourcesCount: number
  notebookSummary?: string
  onSaveResponse?: (message: ChatMessage) => void
  // Chat history props
  sessions?: ChatSession[]
  currentSessionId?: string | null
  onLoadSession?: (sessionId: string) => void
  onNewChat?: () => void
  onDeleteSession?: (sessionId: string) => void
  loadingSessions?: boolean
}

const SUGGESTED_QUESTIONS = [
  'Summarize the key points',
  'What are the main takeaways?',
  'Explain the methodology',
  'What are the limitations?',
]

export function ChatPanel({
  messages,
  message,
  onMessageChange,
  onSendMessage,
  sending,
  selectedSourcesCount,
  totalSourcesCount,
  notebookSummary,
  onSaveResponse,
  sessions = [],
  currentSessionId,
  onLoadSession,
  onNewChat,
  onDeleteSession,
  loadingSessions,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Get current session title
  const currentSession = sessions.find(s => s.id === currentSessionId)
  const currentTitle = currentSession?.title || 'New Chat'

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Format short timestamp for duplicate differentiation
  const formatShortTimestamp = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Get display title with timestamp suffix for duplicates
  const getDisplayTitle = (session: ChatSession, allSessions: ChatSession[]) => {
    const duplicates = allSessions.filter(s => s.title === session.title)
    if (duplicates.length > 1) {
      // Add timestamp to differentiate
      return `${session.title} (${formatShortTimestamp(session.created_at)})`
    }
    return session.title
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSendMessage()
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Chat History Header */}
      {(sessions.length > 0 || messages.length > 0) && (
        <div className="h-12 px-4 flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] bg-[var(--bg-primary)] shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 gap-2 px-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
              >
                <MessageSquare className="h-4 w-4 text-[var(--accent-primary)]" />
                <span className="truncate max-w-[200px]">{currentTitle}</span>
                <ChevronDown className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-72 bg-[#1a1a2e] border-[rgba(255,255,255,0.15)] shadow-xl"
            >
              {onNewChat && (
                <>
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer focus:bg-[var(--bg-tertiary)]"
                    onClick={onNewChat}
                  >
                    <Plus className="h-4 w-4 text-[var(--accent-primary)]" />
                    <span>New Chat</span>
                  </DropdownMenuItem>
                  {sessions.length > 0 && <DropdownMenuSeparator className="bg-[rgba(255,255,255,0.1)]" />}
                </>
              )}
              {loadingSessions ? (
                <div className="px-2 py-4 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--text-tertiary)]" />
                </div>
              ) : sessions.length > 0 ? (
                <div className="max-h-64 overflow-y-auto">
                  {sessions.map((session) => (
                    <DropdownMenuItem
                      key={session.id}
                      className={`gap-2 cursor-pointer group focus:bg-[var(--bg-tertiary)] ${
                        session.id === currentSessionId ? 'bg-[var(--accent-primary)]/10' : ''
                      }`}
                      onClick={() => onLoadSession?.(session.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-3.5 w-3.5 text-[var(--text-tertiary)] shrink-0" />
                          <span className="truncate text-sm">{getDisplayTitle(session, sessions)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Clock className="h-3 w-3 text-[var(--text-tertiary)]" />
                          <span className="text-xs text-[var(--text-tertiary)]">
                            {formatDate(session.updated_at)} · {session.message_count} messages
                          </span>
                        </div>
                      </div>
                      {onDeleteSession && session.id !== currentSessionId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteSession(session.id)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </DropdownMenuItem>
                  ))}
                </div>
              ) : (
                <div className="px-2 py-4 text-center text-sm text-[var(--text-tertiary)]">
                  No previous conversations
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {onNewChat && messages.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                  onClick={onNewChat}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Chat</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center min-h-[400px] text-center"
            >
              {/* Hero Icon */}
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/20 flex items-center justify-center mb-6">
                <Sparkles className="h-9 w-9 text-[var(--accent-primary)]" />
              </div>

              <h3 className="text-2xl font-semibold text-[var(--text-primary)] mb-3">
                Start a conversation
              </h3>
              <p className="text-[var(--text-secondary)] mb-8 max-w-md">
                Ask questions about your sources and get AI-powered insights with citations.
              </p>

              {/* Notebook Summary */}
              {notebookSummary && (
                <div className="w-full max-w-lg mb-8 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[rgba(255,255,255,0.1)]">
                  <p className="text-sm text-[var(--text-secondary)]">{notebookSummary}</p>
                </div>
              )}

              {/* Suggested Questions */}
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <Tooltip key={q}>
                    <TooltipTrigger asChild>
                      <motion.button
                        whileHover={selectedSourcesCount > 0 ? { scale: 1.02 } : {}}
                        whileTap={selectedSourcesCount > 0 ? { scale: 0.98 } : {}}
                        onClick={() => selectedSourcesCount > 0 && onSendMessage(q)}
                        disabled={sending || selectedSourcesCount === 0}
                        className="px-4 py-2.5 text-sm rounded-xl border border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--bg-secondary)] disabled:hover:text-[var(--text-secondary)]"
                      >
                        {q}
                      </motion.button>
                    </TooltipTrigger>
                    {selectedSourcesCount === 0 && (
                      <TooltipContent>
                        <p>Select sources first</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                ))}
              </div>
              {selectedSourcesCount === 0 && totalSourcesCount > 0 && (
                <p className="text-sm text-[var(--text-tertiary)] mt-4">
                  Select sources from the left panel to get started
                </p>
              )}
            </motion.div>
          ) : (
            <div className="space-y-6">
              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`
                        max-w-[85%] rounded-2xl px-5 py-4
                        ${msg.role === 'user'
                          ? 'bg-[var(--accent-primary)] text-white rounded-br-md'
                          : 'bg-[var(--bg-secondary)] border border-[rgba(255,255,255,0.1)] rounded-bl-md'
                        }
                      `}
                    >
                      <MessageContent content={msg.content} citations={msg.citations} />

                      {/* Actions for assistant messages */}
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[rgba(255,255,255,0.1)]">
                          {msg.cost_usd !== null && msg.cost_usd > 0 && (
                            <span className="text-xs text-[var(--text-tertiary)]">
                              ${msg.cost_usd.toFixed(4)}
                            </span>
                          )}
                          <div className="flex items-center gap-1 ml-auto">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                                  onClick={() => copyToClipboard(msg.content)}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy</TooltipContent>
                            </Tooltip>
                            {onSaveResponse && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                                    onClick={() => onSaveResponse(msg)}
                                  >
                                    <StickyNote className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Save as note</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              {sending && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-[var(--bg-secondary)] border border-[rgba(255,255,255,0.1)] rounded-2xl rounded-bl-md px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] typing-dot" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] typing-dot" style={{ animationDelay: '200ms' }} />
                        <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] typing-dot" style={{ animationDelay: '400ms' }} />
                      </div>
                      <span className="text-sm text-[var(--text-tertiary)]">Thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-[rgba(255,255,255,0.1)] bg-[var(--bg-primary)] p-4">
        <div className="max-w-3xl mx-auto">
          {/* Source warning */}
          {selectedSourcesCount === 0 && totalSourcesCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mb-3 px-4 py-2.5 text-sm text-[var(--warning)] bg-[var(--warning)]/10 rounded-xl border border-[var(--warning)]/20"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Select sources from the left panel for contextual answers</span>
            </motion.div>
          )}

          {/* Input */}
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                placeholder="Ask a question about your sources..."
                value={message}
                onChange={(e) => onMessageChange(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
                rows={1}
                className="min-h-[52px] max-h-[200px] resize-none py-4 px-4 pr-12 text-[15px] rounded-xl bg-[var(--bg-secondary)] border-[rgba(255,255,255,0.1)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]"
              />
            </div>
            <Button
              onClick={() => onSendMessage()}
              disabled={sending || !message.trim()}
              size="lg"
              className="h-[52px] w-[52px] rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white shrink-0"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper component to render message content with citations
function MessageContent({ content, citations }: { content: string; citations: Citation[] }) {
  const [activeCitation, setActiveCitation] = useState<number | null>(null)
  const [loadingSource, setLoadingSource] = useState<string | null>(null)
  const supabase = createClient()

  // Open source file in new tab
  const viewSource = useCallback(async (citation: Citation) => {
    if (!citation.source_id) {
      toast.error('Source not available')
      return
    }

    setLoadingSource(citation.source_id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/sources/${citation.source_id}/view`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to get source URL')
      }

      const data = await response.json()
      if (data.url) {
        window.open(data.url, '_blank')
      }
    } catch (error) {
      console.error('Failed to view source:', error)
      toast.error('Failed to open source')
    }
    setLoadingSource(null)
  }, [supabase])

  // Parse content to make citation references clickable
  const renderContentWithCitations = useCallback(() => {
    // Split content by citation patterns like [1], [2], etc.
    const citationRegex = /\[(\d+)\]/g
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match

    while ((match = citationRegex.exec(content)) !== null) {
      // Add text before the citation
      if (match.index > lastIndex) {
        const textBefore = content.slice(lastIndex, match.index)
        parts.push(
          <ReactMarkdown
            key={`text-${lastIndex}`}
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <span>{children}</span>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              ul: ({ children }) => <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-[var(--text-primary)]">{children}</li>,
              code: ({ children }) => (
                <code className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-sm font-mono">{children}</code>
              ),
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] hover:underline">
                  {children}
                </a>
              ),
            }}
          >
            {textBefore}
          </ReactMarkdown>
        )
      }

      // Add the clickable citation
      const citationNumber = parseInt(match[1])
      const citation = citations?.find(c => c.number === citationNumber)

      parts.push(
        <Popover key={`citation-${match.index}`}>
          <PopoverTrigger asChild>
            <button
              className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1 mx-0.5 text-xs font-medium rounded bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/30 transition-colors cursor-pointer align-middle"
              onClick={() => setActiveCitation(activeCitation === citationNumber ? null : citationNumber)}
            >
              [{citationNumber}]
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 p-4 bg-[#1a1a2e] border border-[rgba(255,255,255,0.2)] shadow-xl z-[100]"
            sideOffset={5}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[var(--accent-primary)]/20 flex items-center justify-center text-xs font-bold text-[var(--accent-primary)]">
                  {citationNumber}
                </div>
                <p className="text-sm font-medium text-[var(--text-primary)] flex-1 truncate">
                  {citation?.source_name || 'Source'}
                </p>
                {citation?.file_path && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20"
                    onClick={() => citation && viewSource(citation)}
                    disabled={loadingSource === citation?.source_id}
                  >
                    {loadingSource === citation?.source_id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View
                      </>
                    )}
                  </Button>
                )}
              </div>
              {citation?.text ? (
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed border-l-2 border-[var(--accent-primary)]/30 pl-3">
                  "{citation.text}"
                </p>
              ) : (
                <p className="text-sm text-[var(--text-tertiary)] italic">
                  Referenced from this source
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )

      lastIndex = match.index + match[0].length
    }

    // Add remaining text after last citation
    if (lastIndex < content.length) {
      const remainingText = content.slice(lastIndex)
      parts.push(
        <ReactMarkdown
          key={`text-${lastIndex}`}
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <span>{children}</span>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            ul: ({ children }) => <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="text-[var(--text-primary)]">{children}</li>,
            code: ({ children }) => (
              <code className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-sm font-mono">{children}</code>
            ),
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] hover:underline">
                {children}
              </a>
            ),
          }}
        >
          {remainingText}
        </ReactMarkdown>
      )
    }

    // If no citations found, just render markdown
    if (parts.length === 0) {
      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            ul: ({ children }) => <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="text-[var(--text-primary)]">{children}</li>,
            code: ({ children }) => (
              <code className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-sm font-mono">{children}</code>
            ),
            pre: ({ children }) => (
              <pre className="p-3 rounded-lg bg-[var(--bg-tertiary)] overflow-x-auto my-2">{children}</pre>
            ),
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] hover:underline">
                {children}
              </a>
            ),
            h1: ({ children }) => <h1 className="text-xl font-bold mb-2 mt-4">{children}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>,
            h3: ({ children }) => <h3 className="text-base font-bold mb-1 mt-2">{children}</h3>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-[var(--accent-primary)] pl-3 my-2 text-[var(--text-secondary)]">
                {children}
              </blockquote>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      )
    }

    return parts
  }, [content, citations, activeCitation, loadingSource, viewSource])

  return (
    <div className="text-[15px] leading-relaxed text-[var(--text-primary)]">
      <div className="prose prose-invert max-w-none">
        {renderContentWithCitations()}
      </div>
      {citations && citations.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.1)]">
          <p className="text-xs font-medium text-[var(--text-tertiary)] mb-2">Sources:</p>
          <div className="flex flex-wrap gap-2">
            {citations.map((citation, idx) => (
              <Popover key={idx}>
                <PopoverTrigger asChild>
                  <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 transition-colors cursor-pointer">
                    <span className="font-semibold">[{citation.number}]</span>
                    <span className="truncate max-w-[150px]">{citation.source_name}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-80 p-4 bg-[#1a1a2e] border border-[rgba(255,255,255,0.2)] shadow-xl z-[100]"
                  sideOffset={5}
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-[var(--accent-primary)]/20 flex items-center justify-center text-xs font-bold text-[var(--accent-primary)]">
                        {citation.number}
                      </div>
                      <p className="text-sm font-medium text-[var(--text-primary)] flex-1 truncate">
                        {citation.source_name}
                      </p>
                      {citation.file_path && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20"
                          onClick={() => viewSource(citation)}
                          disabled={loadingSource === citation.source_id}
                        >
                          {loadingSource === citation.source_id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    {citation.text ? (
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed border-l-2 border-[var(--accent-primary)]/30 pl-3">
                        "{citation.text}"
                      </p>
                    ) : (
                      <p className="text-sm text-[var(--text-tertiary)] italic">
                        Referenced from this source
                      </p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
