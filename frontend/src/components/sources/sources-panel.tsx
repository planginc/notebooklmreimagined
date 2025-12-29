'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Upload, FileText, Youtube, Link as LinkIcon, Type,
  CheckCircle, Clock, XCircle, Trash2, Eye, Loader2, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Source } from '@/lib/supabase'

interface SourcesPanelProps {
  sources: Source[]
  selectedSources: Set<string>
  onToggleSource: (id: string) => void
  onSelectAll: () => void
  onAddSource: (type: string, data: { input: string; name?: string; file?: File }) => Promise<void>
  onDeleteSource: (id: string) => void
  onViewSource: (source: Source) => void
  uploading?: boolean
}

const SOURCE_COLORS = {
  pdf: 'var(--source-pdf)',
  docx: 'var(--source-doc)',
  txt: 'var(--source-doc)',
  youtube: 'var(--source-video)',
  url: 'var(--source-web)',
  audio: 'var(--source-audio)',
  text: 'var(--text-tertiary)',
}

export function SourcesPanel({
  sources,
  selectedSources,
  onToggleSource,
  onSelectAll,
  onAddSource,
  onDeleteSource,
  onViewSource,
  uploading = false,
}: SourcesPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sourceType, setSourceType] = useState<'file' | 'youtube' | 'url' | 'text'>('file')
  const [sourceInput, setSourceInput] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getSourceIcon = (type: string) => {
    const color = SOURCE_COLORS[type as keyof typeof SOURCE_COLORS] || 'var(--text-tertiary)'
    switch (type) {
      case 'pdf':
      case 'docx':
      case 'txt':
        return <FileText className="h-4 w-4" style={{ color }} />
      case 'youtube':
        return <Youtube className="h-4 w-4" style={{ color }} />
      case 'url':
        return <LinkIcon className="h-4 w-4" style={{ color }} />
      case 'text':
      case 'audio':
      default:
        return <Type className="h-4 w-4" style={{ color }} />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="h-3.5 w-3.5 text-[var(--success)]" />
      case 'processing':
        return <Clock className="h-3.5 w-3.5 text-[var(--warning)] animate-spin" />
      case 'failed':
        return <XCircle className="h-3.5 w-3.5 text-[var(--error)]" />
      default:
        return <Clock className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
    }
  }

  const handleAddSource = async () => {
    if (!sourceInput.trim() && sourceType !== 'file') return
    setIsAdding(true)
    await onAddSource(sourceType, { input: sourceInput, name: sourceName })
    setSourceInput('')
    setSourceName('')
    setDialogOpen(false)
    setIsAdding(false)
  }

  const handleFileUpload = async (file: File) => {
    if (!file) return

    // Validate file type
    const validTypes = ['.pdf', '.docx', '.txt', '.md']
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!validTypes.includes(fileExt)) {
      return
    }

    setIsAdding(true)
    await onAddSource('file', { input: file.name, name: file.name, file })
    setDialogOpen(false)
    setIsAdding(false)
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await handleFileUpload(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      await handleFileUpload(file)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header Actions */}
      <div className="p-4 border-b border-[rgba(255,255,255,0.1)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className="bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-0 text-xs">
              {sources.length} source{sources.length !== 1 ? 's' : ''}
            </Badge>
            {selectedSources.size > 0 && (
              <Badge className="bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border-0 text-xs">
                {selectedSources.size} selected
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="h-8 px-3 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add
          </Button>
        </div>

        {sources.length > 0 && (
          <button
            onClick={onSelectAll}
            className="mt-3 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            {selectedSources.size === sources.length ? 'Deselect all' : 'Select all'}
          </button>
        )}
      </div>

      {/* Sources List */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {sources.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-12 px-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-[var(--text-tertiary)]" />
              </div>
              <p className="font-medium text-[var(--text-primary)] mb-1">No sources yet</p>
              <p className="text-sm text-[var(--text-tertiary)] text-center mb-4">
                Add documents to start analyzing
              </p>
              <Button
                size="sm"
                onClick={() => setDialogOpen(true)}
                className="rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Source
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-1">
              <AnimatePresence>
                {sources.map((source, index) => (
                  <motion.div
                    key={source.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`
                      group relative flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer
                      transition-all duration-150
                      ${selectedSources.has(source.id)
                        ? 'bg-[var(--accent-primary)]/10 ring-1 ring-[var(--accent-primary)]/30'
                        : 'hover:bg-[var(--bg-tertiary)]'
                      }
                    `}
                    onClick={() => onToggleSource(source.id)}
                  >
                    <Checkbox
                      checked={selectedSources.has(source.id)}
                      className="border-[var(--text-tertiary)] data-[state=checked]:bg-[var(--accent-primary)] data-[state=checked]:border-[var(--accent-primary)]"
                    />

                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center shrink-0">
                      {getSourceIcon(source.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {source.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[var(--text-tertiary)] capitalize">
                          {source.type}
                        </span>
                        {source.file_size_bytes && (
                          <span className="text-xs text-[var(--text-tertiary)]">
                            {(source.file_size_bytes / 1024).toFixed(0)} KB
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {getStatusIcon(source.status)}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          onViewSource(source)
                        }}
                      >
                        <Eye className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteSource(source.id)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-[var(--text-secondary)] hover:text-[var(--error)]" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Add Source Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[var(--bg-secondary)] border-[rgba(255,255,255,0.1)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)]">Add Source</DialogTitle>
            <DialogDescription className="text-[var(--text-secondary)]">
              Add documents, URLs, or text to your notebook for AI analysis.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={sourceType} onValueChange={(v) => setSourceType(v as typeof sourceType)} className="mt-2">
            <TabsList className="grid grid-cols-4 w-full bg-[var(--bg-tertiary)] p-1 rounded-xl">
              <TabsTrigger
                value="file"
                className="rounded-lg text-xs data-[state=active]:bg-[var(--bg-surface)] data-[state=active]:text-[var(--text-primary)]"
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                File
              </TabsTrigger>
              <TabsTrigger
                value="youtube"
                className="rounded-lg text-xs data-[state=active]:bg-[var(--bg-surface)] data-[state=active]:text-[var(--text-primary)]"
              >
                <Youtube className="h-3.5 w-3.5 mr-1.5" />
                YouTube
              </TabsTrigger>
              <TabsTrigger
                value="url"
                className="rounded-lg text-xs data-[state=active]:bg-[var(--bg-surface)] data-[state=active]:text-[var(--text-primary)]"
              >
                <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
                URL
              </TabsTrigger>
              <TabsTrigger
                value="text"
                className="rounded-lg text-xs data-[state=active]:bg-[var(--bg-surface)] data-[state=active]:text-[var(--text-primary)]"
              >
                <Type className="h-3.5 w-3.5 mr-1.5" />
                Text
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="mt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                disabled={isAdding}
                className={`w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDragging
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                    : 'border-[rgba(255,255,255,0.15)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--bg-tertiary)]/50'
                }`}
              >
                {isAdding ? (
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
                ) : (
                  <>
                    <Upload className={`h-8 w-8 ${isDragging ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'}`} />
                    <div className="text-center">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {isDragging ? 'Drop file here' : 'Drag & drop or click to upload'}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5">PDF, DOCX, TXT, or MD</p>
                    </div>
                  </>
                )}
              </button>
            </TabsContent>

            <TabsContent value="youtube" className="space-y-3 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">YouTube URL</label>
                <Input
                  placeholder="https://youtube.com/watch?v=..."
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  className="h-10 bg-[var(--bg-tertiary)] border-[rgba(255,255,255,0.1)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">Name (optional)</label>
                <Input
                  placeholder="My video"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  className="h-10 bg-[var(--bg-tertiary)] border-[rgba(255,255,255,0.1)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] rounded-lg"
                />
              </div>
            </TabsContent>

            <TabsContent value="url" className="space-y-3 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">Website URL</label>
                <Input
                  placeholder="https://example.com/article"
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  className="h-10 bg-[var(--bg-tertiary)] border-[rgba(255,255,255,0.1)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">Name (optional)</label>
                <Input
                  placeholder="Article name"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  className="h-10 bg-[var(--bg-tertiary)] border-[rgba(255,255,255,0.1)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] rounded-lg"
                />
              </div>
            </TabsContent>

            <TabsContent value="text" className="space-y-3 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">Name</label>
                <Input
                  placeholder="My notes"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  className="h-10 bg-[var(--bg-tertiary)] border-[rgba(255,255,255,0.1)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">Content</label>
                <Textarea
                  placeholder="Paste your text here..."
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  rows={6}
                  className="bg-[var(--bg-tertiary)] border-[rgba(255,255,255,0.1)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] rounded-lg resize-none"
                />
              </div>
            </TabsContent>
          </Tabs>

          {sourceType !== 'file' && (
            <DialogFooter className="mt-4">
              <Button
                onClick={handleAddSource}
                disabled={isAdding || !sourceInput.trim()}
                className="w-full sm:w-auto rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white"
              >
                {isAdding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Source
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
