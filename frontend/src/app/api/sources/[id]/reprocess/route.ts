import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST: Re-process a source via the FastAPI backend
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: sourceId } = await params;

    // Get auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the source to find notebook_id
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .select(
        `
        id,
        notebook_id,
        notebook:notebooks!inner(user_id)
      `
      )
      .eq('id', sourceId)
      .single();

    if (sourceError || !source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Verify ownership
    const notebookData = source.notebook as unknown as { user_id: string } | { user_id: string }[];
    const notebook = Array.isArray(notebookData) ? notebookData[0] : notebookData;
    if (!notebook || notebook.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Call the FastAPI backend reprocess endpoint
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || 'https://api-production-410d5.up.railway.app';
    const reprocessUrl = `${backendUrl}/api/v1/notebooks/${source.notebook_id}/sources/${sourceId}/reprocess`;

    const backendResponse = await fetch(reprocessUrl, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend reprocess failed:', errorText);
      return NextResponse.json(
        { error: 'Reprocessing failed' },
        { status: backendResponse.status }
      );
    }

    const result = await backendResponse.json();

    return NextResponse.json(result);
  } catch (error) {
    console.error('Reprocess source error:', error);
    return NextResponse.json({ error: 'Failed to reprocess source' }, { status: 500 });
  }
}
