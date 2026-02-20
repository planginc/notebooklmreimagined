'use client';

import {
  ExternalLink,
  FileText,
  Loader2,
  Tag,
  MessageSquare,
  BookOpen,
  Youtube,
  Link as LinkIcon,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Source, createClient } from '@/lib/supabase';

interface SourceViewerContentProps {
  source: Source;
  onReprocessed?: () => void;
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 leading-relaxed last:mb-0">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-[var(--text-primary)]">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="my-2 ml-1 list-inside list-disc space-y-1.5">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="my-2 ml-1 list-inside list-decimal space-y-1.5">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed text-[var(--text-secondary)]">{children}</li>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="rounded bg-[var(--bg-surface)] px-1.5 py-0.5 font-mono text-sm text-[var(--accent-primary)]">
      {children}
    </code>
  ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="my-3 overflow-x-auto rounded-lg bg-[var(--bg-surface)] p-4 text-sm">
      {children}
    </pre>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[var(--accent-primary)] underline decoration-[var(--accent-primary)]/30 hover:decoration-[var(--accent-primary)]"
    >
      {children}
    </a>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="mt-5 mb-3 text-xl font-bold text-[var(--text-primary)]">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mt-4 mb-2 text-lg font-bold text-[var(--text-primary)]">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mt-3 mb-2 text-base font-semibold text-[var(--text-primary)]">{children}</h3>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="mt-2 mb-1 text-sm font-semibold text-[var(--text-primary)]">{children}</h4>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="my-3 border-l-2 border-[var(--accent-primary)] pl-4 text-[var(--text-secondary)] italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-[rgba(255,255,255,0.08)]" />,
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-[rgba(255,255,255,0.1)]">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="border-b border-[rgba(255,255,255,0.1)] bg-[var(--bg-surface)]">
      {children}
    </thead>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="px-3 py-2 text-left font-semibold text-[var(--text-primary)]">{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border-t border-[rgba(255,255,255,0.05)] px-3 py-2 text-[var(--text-secondary)]">
      {children}
    </td>
  ),
};

function FormattedContent({ content }: { content: string }) {
  return (
    <div className="text-sm text-[var(--text-secondary)]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function SourceViewerContent({ source, onReprocessed }: SourceViewerContentProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [reprocessing, setReprocessing] = useState(false);

  const meta = (source.metadata || {}) as Record<string, unknown>;
  const sourceGuide = source.source_guide;
  const topics = sourceGuide?.topics ?? [];
  const suggestedQuestions = sourceGuide?.suggested_questions ?? [];
  const hasContent = !!meta.content;
  const hasUrl = !!meta.url;
  const contentStr = meta.content ? String(meta.content) : '';
  const urlStr = meta.url ? String(meta.url) : '';

  // Fetch signed URL for file-based sources
  useEffect(() => {
    if (!source.file_path) return;
    if (source.type !== 'pdf' && source.type !== 'docx' && source.type !== 'txt') return;

    let cancelled = false;
    const fetchUrl = async () => {
      setLoadingFile(true);
      setFileError(null);
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setFileError('Not authenticated');
          return;
        }

        const res = await fetch(`/api/sources/${source.id}/view`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) {
          setFileError('Failed to load file');
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setFileUrl(data.url);
        }
      } catch {
        if (!cancelled) setFileError('Failed to load file');
      } finally {
        if (!cancelled) setLoadingFile(false);
      }
    };
    fetchUrl();
    return () => {
      cancelled = true;
    };
  }, [source.id, source.file_path, source.type]);

  // Check if we have any source guide content at all
  const hasSourceGuide = !!(
    sourceGuide?.summary ||
    topics.length > 0 ||
    suggestedQuestions.length > 0
  );

  const handleReprocess = async () => {
    setReprocessing(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/sources/${source.id}/reprocess`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        onReprocessed?.();
      }
    } catch {
      // Silently fail
    } finally {
      setReprocessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* YouTube Embed - show video first for YouTube sources */}
      {source.type === 'youtube' && hasUrl && (
        <section>
          {(() => {
            const videoId = extractYouTubeId(urlStr);
            if (videoId) {
              return (
                <div className="aspect-video overflow-hidden rounded-xl">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              );
            }
            return null;
          })()}
          <a
            href={urlStr}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-[var(--accent-primary)] hover:underline"
          >
            Open on YouTube
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </section>
      )}

      {/* URL Link - show link at top for URL sources */}
      {source.type === 'url' && hasUrl && (
        <section>
          <a
            href={urlStr}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--bg-tertiary)] px-4 py-3 text-sm text-[var(--accent-primary)] transition-colors hover:bg-[var(--bg-tertiary)]/80"
          >
            <LinkIcon className="h-4 w-4 shrink-0" />
            <span className="break-all">{urlStr}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>
        </section>
      )}

      {/* Source Guide - Summary */}
      {sourceGuide?.summary && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[var(--accent-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Summary</h3>
          </div>
          <div className="rounded-xl bg-[var(--bg-tertiary)] p-5">
            <FormattedContent content={sourceGuide.summary} />
          </div>
        </section>
      )}

      {/* Source Guide - Topics */}
      {topics.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Tag className="h-4 w-4 text-[var(--accent-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Key Topics</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic, i) => (
              <Badge
                key={i}
                className="border-0 bg-[var(--accent-primary)]/15 px-3 py-1 text-xs font-medium text-[var(--accent-primary)]"
              >
                {topic}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* Source Guide - Suggested Questions */}
      {suggestedQuestions.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[var(--accent-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Suggested Questions
            </h3>
          </div>
          <div className="space-y-2">
            {suggestedQuestions.map((q, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg bg-[var(--bg-tertiary)] px-4 py-3 text-sm text-[var(--text-secondary)]"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)]/15 text-xs font-medium text-[var(--accent-primary)]">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{q}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Full Content - for text sources */}
      {source.type === 'text' && hasContent && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[var(--text-tertiary)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Full Content</h3>
          </div>
          <div className="rounded-xl bg-[var(--bg-tertiary)] p-5">
            <FormattedContent content={contentStr} />
          </div>
        </section>
      )}

      {/* Extracted content for URL sources */}
      {source.type === 'url' && hasContent && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[var(--text-tertiary)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Extracted Content</h3>
          </div>
          <div className="rounded-xl bg-[var(--bg-tertiary)] p-5">
            <FormattedContent content={contentStr} />
          </div>
        </section>
      )}

      {/* Transcript / content for YouTube sources */}
      {source.type === 'youtube' && hasContent && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[var(--text-tertiary)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Transcript</h3>
          </div>
          <div className="rounded-xl bg-[var(--bg-tertiary)] p-5">
            <FormattedContent content={contentStr} />
          </div>
        </section>
      )}

      {/* PDF / File Viewer */}
      {(source.type === 'pdf' || source.type === 'docx' || source.type === 'txt') &&
        source.file_path && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[var(--text-tertiary)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Document</h3>
            </div>

            {loadingFile && (
              <div className="flex items-center justify-center rounded-xl bg-[var(--bg-tertiary)] py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
              </div>
            )}

            {fileError && (
              <div className="rounded-xl bg-[var(--bg-tertiary)] p-4 text-sm text-[var(--error)]">
                {fileError}
              </div>
            )}

            {fileUrl && source.type === 'pdf' && (
              <div className="overflow-hidden rounded-xl border border-[rgba(255,255,255,0.1)]">
                <iframe src={fileUrl} className="h-[60vh] w-full" title={source.name} />
              </div>
            )}

            {fileUrl && source.type !== 'pdf' && (
              <Button
                variant="outline"
                asChild
                className="rounded-lg border-[rgba(255,255,255,0.1)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
              >
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open {source.original_filename || source.name}
                </a>
              </Button>
            )}

            {/* Show extracted text content if available (from processing) */}
            {hasContent && (
              <div className="mt-4 rounded-xl bg-[var(--bg-tertiary)] p-5">
                <FormattedContent content={contentStr} />
              </div>
            )}
          </section>
        )}

      {/* Empty state / Reprocess prompt */}
      {!hasSourceGuide && !hasContent && (
        <section className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-tertiary)]">
            <FileText className="h-5 w-5 text-[var(--text-tertiary)]" />
          </div>
          <p className="mb-1 text-sm font-medium text-[var(--text-primary)]">
            No content extracted yet
          </p>
          <p className="mb-4 text-xs text-[var(--text-tertiary)]">
            Click below to extract content and generate a summary.
          </p>
          <Button
            onClick={handleReprocess}
            disabled={reprocessing}
            className="rounded-lg bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90"
          >
            {reprocessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {reprocessing ? 'Processing...' : 'Extract & Summarize'}
          </Button>
        </section>
      )}

      {/* Metadata footer */}
      <section className="border-t border-[rgba(255,255,255,0.06)] pt-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--text-tertiary)]">
            Added{' '}
            {new Date(source.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
            {source.status !== 'ready' && (
              <span className="ml-2">
                · Status: <span className="capitalize">{source.status}</span>
              </span>
            )}
          </p>
          {hasSourceGuide && (
            <button
              onClick={handleReprocess}
              disabled={reprocessing}
              className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-secondary)]"
            >
              {reprocessing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Reprocess
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
