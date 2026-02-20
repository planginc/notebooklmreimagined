import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Allow up to 60s for AI API calls on Vercel
export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Kimi (Moonshot AI) via OpenAI-compatible API
const KIMI_API_KEY = process.env.KIMI_API_KEY;
const KIMI_MODEL = 'kimi-latest';

// Max chars per source to keep responses fast
const MAX_SOURCE_CHARS = 15000;

// Download file from Supabase Storage and return as text
async function downloadFileAsText(filePath: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage.from('sources').download(filePath);

    if (error || !data) {
      console.error('Failed to download file:', error);
      return null;
    }

    const buffer = await data.arrayBuffer();
    const ext = filePath.split('.').pop()?.toLowerCase();

    // Only handle text-based files
    if (ext === 'txt' || ext === 'md') {
      return Buffer.from(buffer).toString('utf-8');
    }

    // For PDFs, we can't send binary to Kimi - use extracted content from metadata instead
    return null;
  } catch (error) {
    console.error('Error downloading file:', error);
    return null;
  }
}

// Parse citations from the AI response
function extractCitationsFromResponse(
  responseText: string,
  sourceNames: string[]
): {
  cleanedContent: string;
  citations: Array<{ number: number; source_name: string; text: string }>;
} {
  // Check if response has JSON citations block at the end
  const jsonMatch = responseText.match(/\n?---CITATIONS---\n?([\s\S]*?)$/);

  if (jsonMatch) {
    try {
      const citationsJson = JSON.parse(jsonMatch[1]);
      const cleanedContent = responseText.replace(/\n?---CITATIONS---\n?[\s\S]*$/, '').trim();

      return {
        cleanedContent,
        citations: citationsJson.map((c: { number: number; quote: string }) => ({
          number: c.number,
          source_name: sourceNames[c.number - 1] || `Source ${c.number}`,
          text: c.quote || '',
        })),
      };
    } catch {
      // JSON parsing failed, fall through to regex extraction
    }
  }

  // Fallback: Extract citation numbers from [1], [2] patterns
  const citations: Array<{ number: number; source_name: string; text: string }> = [];
  const citationNumbers = new Set<number>();

  const citationMatches = responseText.matchAll(/\[(\d+)\]/g);
  for (const match of citationMatches) {
    citationNumbers.add(parseInt(match[1]));
  }

  for (const num of citationNumbers) {
    citations.push({
      number: num,
      source_name: sourceNames[num - 1] || `Source ${num}`,
      text: '',
    });
  }

  citations.sort((a, b) => a.number - b.number);

  return {
    cleanedContent: responseText,
    citations,
  };
}

// Source info type
interface SourceInfo {
  index: number;
  id: string;
  name: string;
  content?: string;
  filePath?: string;
}

// Generate AI response using Kimi (Moonshot AI)
async function generateAIResponse(message: string, sourceInfos: SourceInfo[]) {
  const sourceNames = sourceInfos.map((s) => s.name);
  const sourceContent = sourceInfos.filter((s) => s.content).map((s) => s.content!);

  if (!KIMI_API_KEY) {
    return generateDemoResponse(message, sourceContent, sourceNames);
  }

  try {
    const client = new OpenAI({
      apiKey: KIMI_API_KEY,
      baseURL: 'https://api.moonshot.ai/v1',
    });

    // Build context text with source indices
    const contextText = sourceInfos
      .filter((s) => s.content)
      .map((s) => `[Source ${s.index}: ${s.name}]\n${s.content}`)
      .join('\n\n---\n\n');

    const systemPrompt = `You are a helpful research assistant. Answer the user's question based ONLY on the provided sources.

CRITICAL CITATION RULES:
- You have exactly ${sourceInfos.length} source(s) numbered [1] through [${sourceInfos.length}]
- ONLY use citation numbers [1] to [${sourceInfos.length}] - no other numbers!
- Each citation MUST reference one of the sources listed below
- When you cite information, use the source number like [1] or [2]

YOUR SOURCES:
${sourceInfos.map((s) => `[${s.index}] = "${s.name}"`).join('\n')}

${contextText ? `TEXT SOURCE CONTENT:\n${contextText}` : ''}

RESPONSE FORMAT:
1. Answer the question using information from the sources
2. Cite using ONLY [1], [2], etc. (up to [${sourceNames.length}])
3. At the very end, add this exact block with quotes from each source you cited:

---CITATIONS---
[{"number": 1, "quote": "the exact text you referenced from source 1"}, {"number": 2, "quote": "the exact text you referenced from source 2"}]`;

    const result = await client.chat.completions.create({
      model: KIMI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
    });

    const text = result.choices[0]?.message?.content || '';

    console.log('[CHAT] Raw response (last 500 chars):', text.slice(-500));

    // Extract citations from the response
    const { cleanedContent, citations } = extractCitationsFromResponse(text, sourceNames);

    console.log('[CHAT] Extracted citations:', JSON.stringify(citations, null, 2));

    // Extract usage info
    const inputTokens = result.usage?.prompt_tokens || 0;
    const outputTokens = result.usage?.completion_tokens || 0;

    return {
      content: cleanedContent,
      citations: citations.map((c) => {
        const sourceInfo = sourceInfos.find((s) => s.index === c.number);
        return {
          number: c.number,
          source_id: sourceInfo?.id || '',
          source_name: c.source_name,
          text: c.text,
          file_path: sourceInfo?.filePath || null,
          confidence: 0.9,
        };
      }),
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: 0,
        model_used: KIMI_MODEL,
      },
    };
  } catch (error) {
    console.error('Kimi API error:', error);
    return generateDemoResponse(message, sourceContent, sourceNames);
  }
}

// Demo response when no API key is configured
function generateDemoResponse(message: string, sourceContent: string[], sourceNames: string[]) {
  if (sourceContent.length === 0) {
    return {
      content: `I don't have any sources to reference. Please add some sources to your notebook and select them to get contextual answers.\n\nYour question was: "${message}"`,
      citations: [],
      usage: { input_tokens: 0, output_tokens: 0, cost_usd: 0, model_used: 'demo-mode' },
    };
  }

  const context = sourceContent
    .slice(0, 3)
    .map((c, i) => `[${i + 1}] ${c.slice(0, 200)}...`)
    .join('\n\n');

  return {
    content: `Based on your sources, here's what I found:\n\n${context}\n\n---\n\n**Note**: This is a demo response. Add a KIMI_API_KEY to your environment to enable AI-powered answers.`,
    citations: sourceNames.map((name, i) => ({
      number: i + 1,
      source_id: '',
      source_name: name,
      text: sourceContent[i]?.slice(0, 100) || '',
      confidence: 0.8,
    })),
    usage: { input_tokens: 0, output_tokens: 0, cost_usd: 0, model_used: 'demo-mode' },
  };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: notebookId } = await params;
    const body = await request.json();
    const { message, source_ids, session_id } = body;

    // Get auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to notebook
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get notebook
    const { data: notebook } = await supabase
      .from('notebooks')
      .select('id')
      .eq('id', notebookId)
      .eq('user_id', user.id)
      .single();

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
    }

    // Get sources content
    let query = supabase
      .from('sources')
      .select('*')
      .eq('notebook_id', notebookId)
      .eq('status', 'ready')
      .order('created_at', { ascending: false });

    if (source_ids && source_ids.length > 0) {
      query = query.in('id', source_ids);
    }

    const { data: sources } = await query;

    // Track sources with their index for proper citation mapping
    const sourceInfos: SourceInfo[] = [];

    for (let i = 0; i < (sources || []).length; i++) {
      const source = sources![i];
      const sourceInfo: SourceInfo = {
        index: i + 1,
        id: source.id,
        name: source.name,
        filePath: source.file_path || undefined,
      };

      // Handle sources with extracted content in metadata (text, url, youtube all store content here)
      if (source.metadata?.content) {
        sourceInfo.content = String(source.metadata.content).slice(0, MAX_SOURCE_CHARS);
      }
      // Handle file sources (TXT, MD - download and read as text)
      else if (source.file_path) {
        console.log(`[CHAT] Downloading file: ${source.file_path}`);
        const textContent = await downloadFileAsText(source.file_path);
        if (textContent) {
          sourceInfo.content = textContent.slice(0, MAX_SOURCE_CHARS);
        }
      }
      // Handle sources with summaries (fallback)
      else if (source.source_guide?.summary) {
        sourceInfo.content = source.source_guide.summary;
      }
      // Handle URL/YouTube sources with just a URL (no extracted content)
      else if ((source.type === 'url' || source.type === 'youtube') && source.metadata?.url) {
        sourceInfo.content = `URL: ${source.metadata.url}`;
      }

      sourceInfos.push(sourceInfo);
    }

    console.log(
      `[CHAT] Processed ${sources?.length || 0} sources: ${sourceInfos.filter((s) => s.content).length} with content`
    );

    // Get or create session
    let currentSessionId = session_id;
    if (!currentSessionId) {
      const { data: session } = await supabase
        .from('chat_sessions')
        .insert({
          notebook_id: notebookId,
          title: message.slice(0, 50),
        })
        .select()
        .single();
      currentSessionId = session?.id;
    }

    // Save user message
    await supabase.from('chat_messages').insert({
      session_id: currentSessionId,
      role: 'user',
      content: message,
      source_ids_used: source_ids || [],
    });

    // Generate AI response
    const response = await generateAIResponse(message, sourceInfos);

    // Save assistant message
    const { data: assistantMsg } = await supabase
      .from('chat_messages')
      .insert({
        session_id: currentSessionId,
        role: 'assistant',
        content: response.content,
        citations: response.citations,
        source_ids_used: source_ids || [],
        model_used: response.usage.model_used,
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        cost_usd: response.usage.cost_usd,
      })
      .select()
      .single();

    return NextResponse.json({
      data: {
        message_id: assistantMsg?.id,
        session_id: currentSessionId,
        content: response.content,
        citations: response.citations,
        suggested_questions: [
          'What are the main themes?',
          'Can you summarize this?',
          'What conclusions can we draw?',
        ],
      },
      usage: response.usage,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 });
  }
}
