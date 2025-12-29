'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Mic, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Download, FileText, Clock, Loader2, AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'

interface AudioOverview {
  id: string
  format: string
  status: string
  script?: string
  audio_url?: string
  duration_seconds?: number
  created_at: string
}

interface AudioPlayerProps {
  audio: AudioOverview | null
  isGenerating?: boolean
  onClose?: () => void
}

export function AudioPlayer({ audio, isGenerating, onClose }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(80)
  const [isMuted, setIsMuted] = useState(false)
  const [showScript, setShowScript] = useState(true)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Handle real audio playback
  useEffect(() => {
    if (audio?.audio_url && audioRef.current) {
      if (isPlaying) {
        audioRef.current.play()
      } else {
        audioRef.current.pause()
      }
    }
  }, [isPlaying, audio?.audio_url])

  // Handle volume changes for real audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100
    }
  }, [volume, isMuted])

  // Simulated playback for when no actual audio file
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying && !audio?.audio_url) {
      // Simulate playback progress
      const fakeDuration = audio?.duration_seconds || 300 // 5 min default
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= fakeDuration) {
            setIsPlaying(false)
            return 0
          }
          return prev + 1
        })
      }, 1000)
      setDuration(fakeDuration)
    }
    return () => clearInterval(interval)
  }, [isPlaying, audio])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatNames: Record<string, string> = {
    deep_dive: 'Deep Dive',
    brief: 'Brief Summary',
    critique: 'Critical Analysis',
    debate: 'Debate Format',
  }

  // Generating state
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center mb-6"
        >
          <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
        </motion.div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Generating Audio</h3>
        <p className="text-sm text-[var(--text-tertiary)] text-center max-w-sm">
          Creating podcast-style audio from your sources. This may take a few minutes...
        </p>
        <div className="flex items-center gap-2 mt-4 text-xs text-[var(--text-tertiary)]">
          <Clock className="h-3.5 w-3.5" />
          Estimated: 2-3 minutes
        </div>
      </div>
    )
  }

  // No audio state
  if (!audio) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
          <Mic className="h-8 w-8 text-[var(--text-tertiary)]" />
        </div>
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No Audio Generated</h3>
        <p className="text-sm text-[var(--text-tertiary)] text-center">
          Generate an audio overview to listen to your sources as a podcast.
        </p>
      </div>
    )
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const isDemoMode = !audio.audio_url

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
            <Mic className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {formatNames[audio.format] || 'Audio Overview'}
            </h2>
            <p className="text-sm text-[var(--text-tertiary)]">
              {new Date(audio.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {isDemoMode && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <AlertCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-400">
              Script generated. Audio playback is simulated - actual TTS synthesis coming soon.
            </p>
          </div>
        )}
      </div>

      {/* Waveform / Album Art Area */}
      <div className="relative mb-6 p-8 rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-[rgba(255,255,255,0.1)]">
        {/* Fake waveform visualization */}
        <div className="flex items-center justify-center gap-1 h-24">
          {Array.from({ length: 40 }).map((_, i) => {
            const height = 20 + Math.sin(i * 0.5 + currentTime * 0.1) * 30 + Math.random() * 20
            const isActive = (i / 40) * 100 <= progress
            return (
              <motion.div
                key={i}
                animate={{ height: isPlaying ? height : 20 + Math.sin(i * 0.5) * 15 }}
                transition={{ duration: 0.1 }}
                className={`w-1 rounded-full ${isActive ? 'bg-orange-500' : 'bg-[var(--bg-surface)]'}`}
              />
            )
          })}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <Slider
          value={[progress]}
          max={100}
          step={0.1}
          onValueChange={(value) => {
            const newTime = (value[0] / 100) * duration
            setCurrentTime(newTime)
            // Seek in real audio if available
            if (audioRef.current && audio?.audio_url) {
              audioRef.current.currentTime = newTime
            }
          }}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-[var(--text-tertiary)] mt-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            const newTime = Math.max(0, currentTime - 15)
            setCurrentTime(newTime)
            if (audioRef.current && audio?.audio_url) {
              audioRef.current.currentTime = newTime
            }
          }}
          className="h-10 w-10 rounded-full text-[var(--text-secondary)]"
        >
          <SkipBack className="h-5 w-5" />
        </Button>

        <Button
          onClick={() => setIsPlaying(!isPlaying)}
          className="h-14 w-14 rounded-full bg-orange-500 hover:bg-orange-500/90 text-white"
        >
          {isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6 ml-1" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            const newTime = Math.min(duration, currentTime + 15)
            setCurrentTime(newTime)
            if (audioRef.current && audio?.audio_url) {
              audioRef.current.currentTime = newTime
            }
          }}
          className="h-10 w-10 rounded-full text-[var(--text-secondary)]"
        >
          <SkipForward className="h-5 w-5" />
        </Button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMuted(!isMuted)}
          className="h-8 w-8 text-[var(--text-tertiary)]"
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
          className="w-24"
        />
        <span className="text-xs text-[var(--text-tertiary)] w-8">{isMuted ? 0 : volume}%</span>
      </div>

      {/* Script Section */}
      <div className="flex-1 min-h-0">
        <button
          onClick={() => setShowScript(!showScript)}
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-3 hover:text-[var(--text-primary)]"
        >
          <FileText className="h-4 w-4" />
          Script
          <span className="text-[var(--text-tertiary)]">({showScript ? 'hide' : 'show'})</span>
        </button>

        {showScript && audio.script && (
          <ScrollArea className="flex-1 h-48 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)]">
            <div className="p-4">
              <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-sans leading-relaxed">
                {audio.script}
              </pre>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Download Button */}
      {audio.audio_url && (
        <Button
          variant="outline"
          className="w-full mt-4 rounded-xl border-[rgba(255,255,255,0.1)]"
        >
          <Download className="h-4 w-4 mr-2" />
          Download Audio
        </Button>
      )}

      {/* Hidden audio element for real playback */}
      {audio.audio_url && (
        <audio
          ref={audioRef}
          src={audio.audio_url}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
          onEnded={() => setIsPlaying(false)}
        />
      )}
    </div>
  )
}
