'use client';

import { FileText, Youtube, Link as LinkIcon, X, Loader2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { SourceViewerContent } from '@/components/sources/source-viewer-content';
import { Button } from '@/components/ui/button';
import { Source, createClient } from '@/lib/supabase';

export default function SourceViewerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [source, setSource] = useState<Source | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSource() {
      const supabase = createClient();

      // Check auth
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      // Fetch source
      const { data, error: fetchError } = await supabase
        .from('sources')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !data) {
        setError('Source not found');
        setLoading(false);
        return;
      }

      setSource(data as Source);
      setLoading(false);
    }

    fetchSource();
  }, [id]);

  function handleClose() {
    // If opened as a popup, close the window; otherwise navigate back
    if (window.opener) {
      window.close();
    } else {
      router.back();
    }
  }

  function handleReprocessed() {
    const supabase = createClient();
    supabase
      .from('sources')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) setSource(data as Source);
      });
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-primary)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
      </div>
    );
  }

  if (error || !source) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-[var(--bg-primary)]">
        <p className="text-[var(--text-secondary)]">{error || 'Source not found'}</p>
        <Button variant="outline" onClick={handleClose}>
          Close
        </Button>
      </div>
    );
  }

  const typeIcon =
    source.type === 'youtube' ? (
      <Youtube className="h-5 w-5 text-[var(--source-video)]" />
    ) : source.type === 'url' ? (
      <LinkIcon className="h-5 w-5 text-[var(--source-web)]" />
    ) : (
      <FileText className="h-5 w-5 text-[var(--source-pdf)]" />
    );

  return (
    <div className="flex h-screen flex-col bg-[var(--bg-secondary)]">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-[rgba(255,255,255,0.1)] px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-tertiary)]">
          {typeIcon}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-[var(--text-primary)]">
            {source.name}
          </h1>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
            <span className="capitalize">{source.type}</span>
            {source.file_size_bytes && (
              <>
                <span>·</span>
                <span>{(source.file_size_bytes / 1024).toFixed(0)} KB</span>
              </>
            )}
            {source.token_count && (
              <>
                <span>·</span>
                <span>{source.token_count.toLocaleString()} tokens</span>
              </>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="h-9 w-9 shrink-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <X className="h-5 w-5" />
        </Button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <SourceViewerContent source={source} onReprocessed={handleReprocessed} />
      </div>
    </div>
  );
}
