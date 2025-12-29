import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateVideoScript, generateVideo, checkVideoOperation, isGeminiConfigured } from '@/lib/gemini'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function verifyAccess(request: NextRequest, notebookId: string) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)

  if (!user) return null

  const { data: notebook } = await supabase
    .from('notebooks')
    .select('id')
    .eq('id', notebookId)
    .eq('user_id', user.id)
    .single()

  if (!notebook) return null

  return user
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notebookId } = await params
    const user = await verifyAccess(request, notebookId)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check for operation_id query param to check video generation status
    const { searchParams } = new URL(request.url)
    const operationId = searchParams.get('operation_id')

    if (operationId) {
      try {
        const status = await checkVideoOperation(operationId)
        return NextResponse.json({ data: status })
      } catch (error) {
        console.error('Operation check error:', error)
        return NextResponse.json({ error: 'Failed to check operation status' }, { status: 500 })
      }
    }

    const { data: videos } = await supabase
      .from('video_overviews')
      .select('*')
      .eq('notebook_id', notebookId)
      .order('created_at', { ascending: false })

    return NextResponse.json({ data: videos || [] })
  } catch (error) {
    console.error('List videos error:', error)
    return NextResponse.json({ error: 'Failed to list videos' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notebookId } = await params
    const user = await verifyAccess(request, notebookId)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { style, source_ids } = body

    // Check if Gemini is configured
    if (!isGeminiConfigured()) {
      return NextResponse.json({
        error: 'Gemini API not configured. Please set GOOGLE_API_KEY in your environment variables.'
      }, { status: 503 })
    }

    // Get sources
    let query = supabase
      .from('sources')
      .select('*')
      .eq('notebook_id', notebookId)
      .eq('status', 'ready')

    if (source_ids && source_ids.length > 0) {
      query = query.in('id', source_ids)
    }

    const { data: sources } = await query

    if (!sources || sources.length === 0) {
      return NextResponse.json({ error: 'No sources available' }, { status: 400 })
    }

    // Combine source content
    const sourceContent = sources.map(s => {
      const parts: string[] = []
      parts.push(`## ${s.name}`)

      if (s.type === 'text' && s.metadata?.content) {
        parts.push(s.metadata.content)
      }

      if (s.source_guide?.summary) {
        parts.push(`Summary: ${s.source_guide.summary}`)
      }

      if (s.source_guide?.key_topics && s.source_guide.key_topics.length > 0) {
        parts.push(`Key Topics: ${s.source_guide.key_topics.join(', ')}`)
      }

      return parts.join('\n\n')
    }).join('\n\n---\n\n')

    // Limit content to prevent token overflow
    const truncatedContent = sourceContent.slice(0, 100000)

    // Generate real script using Gemini
    const validStyle = (style as 'documentary' | 'explainer' | 'presentation') || 'explainer'

    try {
      // Step 1: Generate the video script
      const script = await generateVideoScript(truncatedContent, validStyle)

      // Step 2: Create a video generation prompt from the script
      // Extract key visual concepts for Veo
      const videoPrompt = `Create a professional ${validStyle} style video visualization.
The video should be visually engaging with smooth transitions, professional graphics, and a modern aesthetic.
Key themes: ${sourceContent.slice(0, 500)}
Style: Clean, modern, educational with subtle motion graphics and text overlays.`

      // Step 3: Attempt video generation with Veo
      let videoUrl: string | undefined
      let operationName: string | undefined
      let durationSeconds = 8

      try {
        const videoResult = await generateVideo(videoPrompt, 8)

        if ('operationName' in videoResult) {
          // Video generation is async - store operation name
          operationName = videoResult.operationName

          // Poll for completion (with timeout)
          let attempts = 0
          const maxAttempts = 30 // 5 minutes max (10s intervals)

          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10s
            attempts++

            try {
              const status = await checkVideoOperation(operationName)
              if (status.done) {
                if (status.videoUrl) {
                  videoUrl = status.videoUrl
                }
                break
              }
            } catch {
              // Continue polling
            }
          }
        } else if ('videoData' in videoResult) {
          // Immediate result - upload to storage
          const videoBuffer = Buffer.from(videoResult.videoData, 'base64')
          const videoFileName = `video_${notebookId}_${Date.now()}.mp4`

          const { error: uploadError } = await supabase.storage
            .from('videos')
            .upload(videoFileName, videoBuffer, {
              contentType: videoResult.mimeType,
              upsert: true
            })

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('videos')
              .getPublicUrl(videoFileName)

            videoUrl = urlData.publicUrl
          }
        }
      } catch (videoError) {
        console.error('Video generation error (continuing with script only):', videoError)
        // Continue without video - we still have the script
      }

      // Estimate duration based on word count if no video
      if (!videoUrl) {
        const wordCount = script.split(/\s+/).length
        durationSeconds = Math.round((wordCount / 150) * 60)
      }

      // Create video record
      const { data: video, error } = await supabase
        .from('video_overviews')
        .insert({
          notebook_id: notebookId,
          style: validStyle,
          status: 'completed',
          progress_percent: 100,
          source_ids: sources.map(s => s.id),
          script,
          video_url: videoUrl,
          duration_seconds: durationSeconds,
          model_used: videoUrl ? 'veo-2.0' : 'gemini-1.5-pro',
          cost_usd: videoUrl ? 0.05 : 0.005,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error('Database error:', error)
        return NextResponse.json({ error: 'Failed to save video overview' }, { status: 400 })
      }

      return NextResponse.json({ data: video })
    } catch (error) {
      console.error('Script generation error:', error)
      return NextResponse.json({
        error: 'Failed to generate video. Please try again.'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Create video error:', error)
    return NextResponse.json({ error: 'Failed to create video' }, { status: 500 })
  }
}
