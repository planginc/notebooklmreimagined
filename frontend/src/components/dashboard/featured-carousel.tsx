'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface FeaturedNotebook {
  id: string
  emoji: string
  name: string
  sourceCount: number
  description?: string | null
  gradient?: string
}

interface FeaturedCarouselProps {
  notebooks: FeaturedNotebook[]
  onOpen: (id: string) => void
}

const gradients = [
  'from-purple-600/20 to-pink-600/20',
  'from-blue-600/20 to-cyan-600/20',
  'from-orange-600/20 to-red-600/20',
  'from-green-600/20 to-teal-600/20',
]

export function FeaturedCarousel({ notebooks, onOpen }: FeaturedCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 340 // Card width + gap
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  if (notebooks.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--accent-primary)]/10 to-[var(--accent-secondary)]/10 border border-[rgba(255,255,255,0.1)] p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-[var(--accent-primary)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            No Featured Notebooks
          </h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm">
            Star your favorite notebooks to see them featured here for quick access.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[var(--accent-primary)]" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Featured</h2>
          <Badge className="bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border-0 text-xs">
            {notebooks.length}
          </Badge>
        </div>

        {notebooks.length > 2 && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => scroll('left')}
              className="h-8 w-8 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => scroll('right')}
              className="h-8 w-8 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide scroll-smooth"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {notebooks.map((notebook, index) => (
          <motion.div
            key={notebook.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onOpen(notebook.id)}
            className={`
              flex-shrink-0 w-80 p-5 rounded-2xl cursor-pointer
              bg-gradient-to-br ${gradients[index % gradients.length]}
              border border-[rgba(255,255,255,0.1)]
              hover:border-[rgba(255,255,255,0.2)] hover:shadow-lg
              transition-all duration-200
            `}
            style={{ scrollSnapAlign: 'start' }}
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-[var(--bg-primary)]/50 flex items-center justify-center text-3xl backdrop-blur-sm">
                {notebook.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base text-[var(--text-primary)] truncate">
                  {notebook.name}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                  {notebook.sourceCount} source{notebook.sourceCount !== 1 ? 's' : ''}
                </p>
                {notebook.description && (
                  <p className="text-sm text-[var(--text-tertiary)] mt-2 line-clamp-2">
                    {notebook.description}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Hide scrollbar but keep functionality */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
