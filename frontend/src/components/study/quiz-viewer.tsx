'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check, X, ChevronRight, RotateCcw, Trophy, Target,
  BookOpen, AlertCircle, ArrowRight, ListChecks, Download, FileSpreadsheet, FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { exportQuizToExcel, exportQuizToPDF, generateFilename } from '@/lib/export-utils'

interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correct_index: number
  explanation: string
}

interface QuizViewerProps {
  questions: QuizQuestion[]
  onClose?: () => void
}

type QuizState = 'question' | 'answer' | 'results'

interface QuizResult {
  questionId: string
  selectedAnswer: number
  isCorrect: boolean
}

export function QuizViewer({ questions, onClose }: QuizViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [state, setState] = useState<QuizState>('question')
  const [results, setResults] = useState<QuizResult[]>([])
  const [showHint, setShowHint] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Export handlers
  const handleExportExcel = async () => {
    setIsExporting(true)
    try {
      await exportQuizToExcel(
        questions.map(q => ({
          question: q.question,
          options: q.options,
          correct_index: q.correct_index,
          explanation: q.explanation
        })),
        generateFilename('quiz')
      )
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportPDF = async () => {
    setIsExporting(true)
    try {
      await exportQuizToPDF(
        questions.map(q => ({
          question: q.question,
          options: q.options,
          correct_index: q.correct_index,
          explanation: q.explanation
        })),
        'Quiz',
        generateFilename('quiz')
      )
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const currentQuestion = questions[currentIndex]
  const progress = ((currentIndex) / questions.length) * 100
  const correctCount = results.filter(r => r.isCorrect).length
  const scorePercent = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (state === 'results') return

    const num = parseInt(e.key)
    if (num >= 1 && num <= currentQuestion?.options.length && state === 'question') {
      setSelectedAnswer(num - 1)
      return
    }

    switch (e.key) {
      case 'Enter':
        e.preventDefault()
        if (state === 'question' && selectedAnswer !== null) {
          checkAnswer()
        } else if (state === 'answer') {
          nextQuestion()
        }
        break
      case 'h':
        if (state === 'question') {
          setShowHint(!showHint)
        }
        break
    }
  }, [state, selectedAnswer, currentQuestion, showHint])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const checkAnswer = () => {
    if (selectedAnswer === null) return

    const isCorrect = selectedAnswer === currentQuestion.correct_index
    setResults([...results, {
      questionId: currentQuestion.id,
      selectedAnswer,
      isCorrect,
    }])
    setState('answer')
  }

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setSelectedAnswer(null)
      setState('question')
      setShowHint(false)
    } else {
      setState('results')
    }
  }

  const resetQuiz = () => {
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setState('question')
    setResults([])
    setShowHint(false)
  }

  const reviewWrong = () => {
    // Get indices of wrong answers
    const wrongIds = results.filter(r => !r.isCorrect).map(r => r.questionId)
    // For simplicity, just restart - in a full implementation we'd filter questions
    resetQuiz()
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ListChecks className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
        <p className="text-[var(--text-secondary)]">No quiz questions available</p>
      </div>
    )
  }

  // Results screen
  if (state === 'results') {
    const grade = scorePercent >= 90 ? 'A' : scorePercent >= 80 ? 'B' : scorePercent >= 70 ? 'C' : scorePercent >= 60 ? 'D' : 'F'
    const gradeColor = scorePercent >= 70 ? 'text-[var(--success)]' : scorePercent >= 60 ? 'text-[var(--warning)]' : 'text-[var(--error)]'

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center py-8"
      >
        {/* Trophy/Results Icon */}
        <div className={`
          w-20 h-20 rounded-full flex items-center justify-center mb-6
          ${scorePercent >= 70 ? 'bg-[var(--success)]/20' : 'bg-[var(--warning)]/20'}
        `}>
          {scorePercent >= 70 ? (
            <Trophy className="h-10 w-10 text-[var(--success)]" />
          ) : (
            <Target className="h-10 w-10 text-[var(--warning)]" />
          )}
        </div>

        {/* Score */}
        <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
          Quiz Complete!
        </h2>
        <p className="text-[var(--text-secondary)] mb-6">
          You scored {correctCount} out of {questions.length}
        </p>

        {/* Grade Circle */}
        <div className="relative w-32 h-32 mb-6">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke="var(--bg-tertiary)"
              strokeWidth="8"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke={scorePercent >= 70 ? 'var(--success)' : scorePercent >= 60 ? 'var(--warning)' : 'var(--error)'}
              strokeWidth="8"
              strokeDasharray={`${scorePercent * 3.52} 352`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${gradeColor}`}>{grade}</span>
            <span className="text-sm text-[var(--text-tertiary)]">{scorePercent}%</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 w-full max-w-xs mb-8">
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--success)]">{correctCount}</p>
            <p className="text-xs text-[var(--text-tertiary)]">Correct</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--error)]">{questions.length - correctCount}</p>
            <p className="text-xs text-[var(--text-tertiary)]">Wrong</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--text-primary)]">{questions.length}</p>
            <p className="text-xs text-[var(--text-tertiary)]">Total</p>
          </div>
        </div>

        {/* Answer Review */}
        <div className="w-full max-w-md space-y-2 mb-8">
          <p className="text-sm font-medium text-[var(--text-tertiary)] mb-3">Answer Summary</p>
          {results.map((result, idx) => (
            <div
              key={result.questionId}
              className={`
                flex items-center gap-3 p-3 rounded-lg
                ${result.isCorrect ? 'bg-[var(--success)]/10' : 'bg-[var(--error)]/10'}
              `}
            >
              <div className={`
                w-6 h-6 rounded-full flex items-center justify-center
                ${result.isCorrect ? 'bg-[var(--success)]/20 text-[var(--success)]' : 'bg-[var(--error)]/20 text-[var(--error)]'}
              `}>
                {result.isCorrect ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              </div>
              <span className="text-sm text-[var(--text-primary)] truncate flex-1">
                Q{idx + 1}: {questions.find(q => q.id === result.questionId)?.question.slice(0, 40)}...
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 flex-wrap justify-center">
          <Button onClick={resetQuiz} variant="outline" className="rounded-xl">
            <RotateCcw className="h-4 w-4 mr-2" />
            Retake Quiz
          </Button>
          {correctCount < questions.length && (
            <Button onClick={reviewWrong} className="rounded-xl bg-[var(--accent-primary)]">
              <BookOpen className="h-4 w-4 mr-2" />
              Review Wrong Answers
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl" disabled={isExporting}>
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="bg-[var(--bg-secondary)] border-[rgba(255,255,255,0.1)]">
              <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-500" />
                Download as Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                <FileText className="h-4 w-4 mr-2 text-red-500" />
                Download as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress Header */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-[var(--text-tertiary)] whitespace-nowrap">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="text-[var(--text-tertiary)] whitespace-nowrap flex-shrink-0">
            Score: {correctCount}/{results.length}
          </span>
        </div>
        <Progress value={progress} className="h-2 bg-[var(--bg-tertiary)]" />
      </div>

      {/* Question Card */}
      <motion.div
        key={currentQuestion?.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1"
      >
        {/* Question */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-surface)] border border-[rgba(255,255,255,0.1)] mb-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-[var(--accent-primary)]">{currentIndex + 1}</span>
            </div>
            <p className="text-lg font-medium text-[var(--text-primary)] leading-relaxed">
              {currentQuestion?.question}
            </p>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion?.options.map((option, idx) => {
            const isSelected = selectedAnswer === idx
            const isCorrect = idx === currentQuestion.correct_index
            const showResult = state === 'answer'

            let bgClass = 'bg-[var(--bg-secondary)] border-[rgba(255,255,255,0.1)] hover:bg-[var(--bg-tertiary)] hover:border-[rgba(255,255,255,0.2)]'

            if (isSelected && !showResult) {
              bgClass = 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]'
            } else if (showResult) {
              if (isCorrect) {
                bgClass = 'bg-[var(--success)]/10 border-[var(--success)]'
              } else if (isSelected && !isCorrect) {
                bgClass = 'bg-[var(--error)]/10 border-[var(--error)]'
              }
            }

            return (
              <motion.button
                key={idx}
                whileHover={state === 'question' ? { scale: 1.01 } : {}}
                whileTap={state === 'question' ? { scale: 0.99 } : {}}
                disabled={state === 'answer'}
                onClick={() => state === 'question' && setSelectedAnswer(idx)}
                className={`
                  w-full text-left p-4 rounded-xl border-2 transition-all
                  ${bgClass}
                  ${state === 'answer' ? 'cursor-default' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-center gap-3">
                  {/* Option Letter */}
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm
                    ${showResult && isCorrect
                      ? 'bg-[var(--success)]/20 text-[var(--success)]'
                      : showResult && isSelected && !isCorrect
                      ? 'bg-[var(--error)]/20 text-[var(--error)]'
                      : isSelected
                      ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]'
                      : 'bg-[var(--bg-surface)] text-[var(--text-tertiary)]'
                    }
                  `}>
                    {String.fromCharCode(65 + idx)}
                  </div>

                  {/* Option Text */}
                  <span className="flex-1 text-[var(--text-primary)]">{option}</span>

                  {/* Result Icon */}
                  {showResult && (isCorrect || (isSelected && !isCorrect)) && (
                    <div className={`
                      w-6 h-6 rounded-full flex items-center justify-center
                      ${isCorrect ? 'bg-[var(--success)] text-white' : 'bg-[var(--error)] text-white'}
                    `}>
                      {isCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </div>
                  )}
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* Explanation */}
        <AnimatePresence>
          {state === 'answer' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 overflow-hidden"
            >
              <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[rgba(255,255,255,0.1)]">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-[var(--info)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Explanation</p>
                    <p className="text-sm text-[var(--text-secondary)]">{currentQuestion?.explanation}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Action Button */}
      <div className="mt-6">
        {state === 'question' ? (
          <Button
            onClick={checkAnswer}
            disabled={selectedAnswer === null}
            className="w-full h-12 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white disabled:opacity-50"
          >
            Check Answer
            <ChevronRight className="h-5 w-5 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={nextQuestion}
            className="w-full h-12 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white"
          >
            {currentIndex < questions.length - 1 ? (
              <>
                Next Question
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            ) : (
              <>
                See Results
                <Trophy className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>
        )}
      </div>

      {/* Keyboard Hint */}
      <div className="flex justify-center mt-4">
        <span className="text-xs text-[var(--text-tertiary)]">
          Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] font-mono mx-1">1-4</kbd> to select,
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] font-mono mx-1">Enter</kbd> to continue
        </span>
      </div>
    </div>
  )
}
