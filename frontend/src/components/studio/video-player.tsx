'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Video, Play, Pause, Volume2, VolumeX, Maximize, Download,
  FileText, Clock, Loader2, AlertCircle, Film
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'

interface VideoOverview {
  id: string
  style: string
  status: string
  script?: string
  video_url?: string
  thumbnail_url?: string
  duration_seconds?: number
  created_at: string
}

interface VideoPlayerProps {
  video: VideoOverview | null
  isGenerating?: boolean
  onClose?: () => void
}

export function VideoPlayer({ video, isGenerating, onClose }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(80)
  const [isMuted, setIsMuted] = useState(false)
  const [showScript, setShowScript] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  const styleNames: Record<string, string> = {
    documentary: 'Documentary',
    explainer: 'Explainer',
    presentation: 'Presentation',
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Handle real video playback
  useEffect(() => {
    if (video?.video_url && videoRef.current) {
      if (isPlaying) {
        videoRef.current.play()
      } else {
        videoRef.current.pause()
      }
    }
  }, [isPlaying, video?.video_url])

  // Handle volume changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume / 100
    }
  }, [volume, isMuted])

  // Set initial duration from video data
  useEffect(() => {
    if (video?.duration_seconds) {
      setDuration(video.duration_seconds)
    }
  }, [video?.duration_seconds])

  // Generating state
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-6"
        >
          <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
        </motion.div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Generating Video</h3>
        <p className="text-sm text-[var(--text-tertiary)] text-center max-w-sm">
          Creating visual explainer from your sources. This may take several minutes...
        </p>
        <div className="flex items-center gap-2 mt-4 text-xs text-[var(--text-tertiary)]">
          <Clock className="h-3.5 w-3.5" />
          Estimated: 5-10 minutes
        </div>
      </div>
    )
  }

  // No video state
  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
          <Video className="h-8 w-8 text-[var(--text-tertiary)]" />
        </div>
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No Video Generated</h3>
        <p className="text-sm text-[var(--text-tertiary)] text-center">
          Generate a video overview to visualize your sources.
        </p>
      </div>
    )
  }

  const videoDuration = duration || video.duration_seconds || 120
  const progress = videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0
  const isDemoMode = !video.video_url

  const handleSeek = (value: number[]) => {
    const newTime = (value[0] / 100) * videoDuration
    setCurrentTime(newTime)
    if (videoRef.current && video.video_url) {
      videoRef.current.currentTime = newTime
    }
  }

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        videoRef.current.requestFullscreen()
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <Video className="h-6 w-6 text-purple-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {styleNames[video.style] || 'Video Overview'}
            </h2>
            <p className="text-sm text-[var(--text-tertiary)]">
              {new Date(video.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {isDemoMode && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <AlertCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-400">
              Script generated. Video playback is simulated - actual video synthesis coming soon.
            </p>
          </div>
        )}
      </div>

      {/* Video Player Area */}
      <div className="relative aspect-video mb-6 rounded-2xl overflow-hidden bg-[var(--bg-tertiary)] border border-[rgba(255,255,255,0.1)]">
        {/* Real Video or Placeholder */}
        {video.video_url ? (
          <video
            ref={videoRef}
            src={video.video_url}
            className="w-full h-full object-cover"
            onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
            onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
            onEnded={() => setIsPlaying(false)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-500/10 to-pink-500/10">
            <motion.div
              animate={isPlaying ? { scale: [1, 1.05, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-20 h-20 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mb-4 shadow-xl"
            >
              <Film className="h-10 w-10 text-purple-500" />
            </motion.div>
            <p className="text-sm text-[var(--text-secondary)]">
              {isPlaying ? 'Playing demo video...' : 'Video Preview'}
            </p>
            {isPlaying && (
              <div className="flex gap-1 mt-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                    className="w-2 h-2 rounded-full bg-purple-500"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Play/Pause Overlay */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity"
        >
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
            {isPlaying ? (
              <Pause className="h-8 w-8 text-[var(--bg-primary)]" />
            ) : (
              <Play className="h-8 w-8 text-[var(--bg-primary)] ml-1" />
            )}
          </div>
        </button>

        {/* Duration Badge */}
        <div className="absolute bottom-4 right-4 px-2 py-1 rounded bg-black/70 text-white text-xs">
          {formatTime(videoDuration)}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <Slider
          value={[progress]}
          max={100}
          step={0.1}
          onValueChange={handleSeek}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-[var(--text-tertiary)] mt-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(videoDuration)}</span>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsPlaying(!isPlaying)}
            className="h-10 w-10 rounded-full bg-purple-500 hover:bg-purple-500/90 text-white"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="h-9 w-9 text-[var(--text-tertiary)]"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>

          <Slider
            value={[isMuted ? 0 : volume]}
            max={100}
            onValueChange={(value) => {
              setVolume(value[0])
              setIsMuted(value[0] === 0)
            }}
            className="w-20"
          />
        </div>

        <div className="flex gap-2">
          {video.video_url && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="h-9 w-9 text-[var(--text-tertiary)]"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          )}
          {video.video_url && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(video.video_url, '_blank')}
              className="h-9 w-9 text-[var(--text-tertiary)]"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Script Section */}
      <div className="flex-1 min-h-0">
        <button
          onClick={() => setShowScript(!showScript)}
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-3 hover:text-[var(--text-primary)]"
        >
          <FileText className="h-4 w-4" />
          Video Script
          <span className="text-[var(--text-tertiary)]">({showScript ? 'hide' : 'show'})</span>
        </button>

        {showScript && video.script && (
          <ScrollArea className="flex-1 h-40 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)]">
            <div className="p-4">
              <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-sans leading-relaxed">
                {video.script}
              </pre>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
