'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle, Check, X, BookOpen, Keyboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface Flashcard {
  id: string
  front: string
  back: string
}

interface FlashcardViewerProps {
  flashcards: Flashcard[]
  onClose?: () => void
}

export function FlashcardViewer({ flashcards, onClose }: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set())
  const [unknownCards, setUnknownCards] = useState<Set<string>>(new Set())
  const [showControls, setShowControls] = useState(true)
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>(flashcards)

  const currentCard = shuffledCards[currentIndex]
  const progress = ((currentIndex + 1) / shuffledCards.length) * 100

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case ' ':
      case 'Enter':
        e.preventDefault()
        setIsFlipped(!isFlipped)
        break
      case 'ArrowLeft':
        e.preventDefault()
        if (currentIndex > 0) {
          setCurrentIndex(currentIndex - 1)
          setIsFlipped(false)
        }
        break
      case 'ArrowRight':
        e.preventDefault()
        if (currentIndex < shuffledCards.length - 1) {
          setCurrentIndex(currentIndex + 1)
          setIsFlipped(false)
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        markKnown()
        break
      case 'ArrowDown':
        e.preventDefault()
        markUnknown()
        break
      case 'r':
        e.preventDefault()
        resetDeck()
        break
      case 's':
        e.preventDefault()
        shuffleDeck()
        break
    }
  }, [currentIndex, isFlipped, shuffledCards.length])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const nextCard = () => {
    if (currentIndex < shuffledCards.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setIsFlipped(false)
    }
  }

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setIsFlipped(false)
    }
  }

  const markKnown = () => {
    if (currentCard) {
      const newKnown = new Set(knownCards)
      newKnown.add(currentCard.id)
      setKnownCards(newKnown)
      unknownCards.delete(currentCard.id)
      setUnknownCards(new Set(unknownCards))
      nextCard()
    }
  }

  const markUnknown = () => {
    if (currentCard) {
      const newUnknown = new Set(unknownCards)
      newUnknown.add(currentCard.id)
      setUnknownCards(newUnknown)
      knownCards.delete(currentCard.id)
      setKnownCards(new Set(knownCards))
      nextCard()
    }
  }

  const resetDeck = () => {
    setCurrentIndex(0)
    setIsFlipped(false)
    setKnownCards(new Set())
    setUnknownCards(new Set())
    setShuffledCards(flashcards)
  }

  const shuffleDeck = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5)
    setShuffledCards(shuffled)
    setCurrentIndex(0)
    setIsFlipped(false)
  }

  const reviewUnknown = () => {
    const unknownFlashcards = flashcards.filter(c => unknownCards.has(c.id))
    if (unknownFlashcards.length > 0) {
      setShuffledCards(unknownFlashcards)
      setCurrentIndex(0)
      setIsFlipped(false)
    }
  }

  // Check if we're done
  const isDone = currentIndex === shuffledCards.length - 1 && (knownCards.has(currentCard?.id) || unknownCards.has(currentCard?.id))

  if (shuffledCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <BookOpen className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
        <p className="text-[var(--text-secondary)]">No flashcards available</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress Header */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-[var(--text-tertiary)] whitespace-nowrap">
            Card {currentIndex + 1} of {shuffledCards.length}
          </span>
          <div className="flex items-center gap-3 text-xs flex-shrink-0">
            <span className="flex items-center gap-1 text-[var(--success)] whitespace-nowrap">
              <Check className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{knownCards.size}</span>
            </span>
            <span className="flex items-center gap-1 text-[var(--error)] whitespace-nowrap">
              <X className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{unknownCards.size}</span>
            </span>
          </div>
        </div>
        <Progress value={progress} className="h-2 bg-[var(--bg-tertiary)]" />
      </div>

      {/* Flashcard */}
      <div className="flex-1 flex items-center justify-center perspective-1000 min-h-[280px]">
        <motion.div
          className="relative w-full max-w-md cursor-pointer"
          onClick={() => setIsFlipped(!isFlipped)}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentCard?.id}-${isFlipped}`}
              initial={{ rotateY: isFlipped ? -90 : 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: isFlipped ? 90 : -90, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={`
                min-h-[250px] p-8 rounded-2xl
                border-2 transition-colors
                ${isFlipped
                  ? 'bg-gradient-to-br from-[var(--accent-primary)]/10 to-[var(--accent-secondary)]/10 border-[var(--accent-primary)]/30'
                  : 'bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-surface)] border-[rgba(255,255,255,0.1)]'
                }
                flex flex-col justify-center
                shadow-xl hover:shadow-2xl
              `}
            >
              {/* Card Label */}
              <div className="absolute top-4 left-4">
                <span className={`
                  text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded-md
                  ${isFlipped
                    ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]'
                    : 'bg-[var(--bg-surface)] text-[var(--text-tertiary)]'
                  }
                `}>
                  {isFlipped ? 'Answer' : 'Question'}
                </span>
              </div>

              {/* Card Content */}
              <div className="text-center mt-4">
                <p className="text-xl leading-relaxed text-[var(--text-primary)] font-medium">
                  {isFlipped ? currentCard?.back : currentCard?.front}
                </p>
              </div>

              {/* Tap Hint */}
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <span className="text-xs text-[var(--text-tertiary)]">
                  {isFlipped ? 'Tap to see question' : 'Tap to reveal answer'}
                </span>
              </div>

              {/* Card Number Badge */}
              <div className="absolute top-4 right-4">
                <span className="text-xs text-[var(--text-tertiary)] font-mono">
                  #{currentIndex + 1}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Action Buttons - Show after flip */}
      <AnimatePresence>
        {isFlipped && !isDone && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex gap-3 justify-center my-6"
          >
            <Button
              onClick={(e) => { e.stopPropagation(); markUnknown() }}
              className="flex-1 max-w-[140px] h-12 rounded-xl bg-[var(--error)]/10 hover:bg-[var(--error)]/20 text-[var(--error)] border border-[var(--error)]/30"
            >
              <X className="h-5 w-5 mr-2" />
              Study Again
            </Button>
            <Button
              onClick={(e) => { e.stopPropagation(); markKnown() }}
              className="flex-1 max-w-[140px] h-12 rounded-xl bg-[var(--success)]/10 hover:bg-[var(--success)]/20 text-[var(--success)] border border-[var(--success)]/30"
            >
              <Check className="h-5 w-5 mr-2" />
              Got It!
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4 mt-4">
        <Button
          variant="outline"
          size="icon"
          disabled={currentIndex === 0}
          onClick={prevCard}
          className="h-11 w-11 rounded-xl border-[rgba(255,255,255,0.1)] disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* Card Position Dots */}
        <div className="flex gap-1.5 overflow-x-auto max-w-[200px] py-2">
          {shuffledCards.map((card, idx) => (
            <button
              key={card.id}
              onClick={() => { setCurrentIndex(idx); setIsFlipped(false) }}
              className={`
                w-2 h-2 rounded-full transition-all flex-shrink-0
                ${idx === currentIndex
                  ? 'w-6 bg-[var(--accent-primary)]'
                  : knownCards.has(card.id)
                  ? 'bg-[var(--success)]'
                  : unknownCards.has(card.id)
                  ? 'bg-[var(--error)]'
                  : 'bg-[var(--bg-surface)] hover:bg-[var(--text-tertiary)]'
                }
              `}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          disabled={currentIndex === shuffledCards.length - 1}
          onClick={nextCard}
          className="h-11 w-11 rounded-xl border-[rgba(255,255,255,0.1)] disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Control Bar */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-[rgba(255,255,255,0.1)]">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={shuffleDeck}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <Shuffle className="h-4 w-4 mr-1.5" />
            Shuffle
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetDeck}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Reset
          </Button>
        </div>

        {unknownCards.size > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={reviewUnknown}
            className="text-[var(--error)] border-[var(--error)]/30 hover:bg-[var(--error)]/10"
          >
            Review {unknownCards.size} cards
          </Button>
        )}
      </div>

      {/* Keyboard Shortcuts */}
      <button
        onClick={() => setShowControls(!showControls)}
        className="flex items-center justify-center gap-2 mt-4 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
      >
        <Keyboard className="h-3.5 w-3.5" />
        Keyboard shortcuts
      </button>

      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-[var(--text-tertiary)]">
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] font-mono">Space</kbd>
                <span>Flip card</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] font-mono">&larr; &rarr;</kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] font-mono">&uarr;</kbd>
                <span>Mark known</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] font-mono">&darr;</kbd>
                <span>Mark unknown</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion Screen */}
      <AnimatePresence>
        {isDone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 bg-[var(--bg-primary)]/95 backdrop-blur-sm flex items-center justify-center rounded-lg z-10"
          >
            <div className="text-center p-8">
              <div className="w-16 h-16 rounded-full bg-[var(--success)]/20 flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-[var(--success)]" />
              </div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                Deck Complete!
              </h3>
              <p className="text-[var(--text-secondary)] mb-6">
                You reviewed {shuffledCards.length} cards
              </p>
              <div className="flex gap-4 justify-center mb-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--success)]">{knownCards.size}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">Known</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--error)]">{unknownCards.size}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">To Review</p>
                </div>
              </div>
              <div className="flex gap-3 justify-center">
                <Button onClick={resetDeck} variant="outline" className="rounded-xl">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Start Over
                </Button>
                {unknownCards.size > 0 && (
                  <Button onClick={reviewUnknown} className="rounded-xl bg-[var(--accent-primary)]">
                    Review Unknown
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
