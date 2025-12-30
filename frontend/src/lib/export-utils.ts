/**
 * Export utilities for downloading study materials
 * Supports XLSX (Excel), PDF, and PNG exports
 */

// ============================================================================
// Types
// ============================================================================

export interface Flashcard {
  id?: string
  front: string
  back: string
  question?: string
  answer?: string
}

export interface QuizQuestion {
  id?: string
  question: string
  options: string[]
  correct_index: number
  explanation: string
}

export interface FAQItem {
  question: string
  answer: string
}

export interface StudyGuideSection {
  heading: string
  content: string
}

export interface StudyGuide {
  title: string
  sections: StudyGuideSection[]
}

export interface MindMapNode {
  id: string
  label: string
  description?: string
  children?: MindMapNode[]
}

// ============================================================================
// Excel (XLSX) Export
// ============================================================================

/**
 * Download data as an Excel file
 */
export async function downloadAsExcel(
  data: Record<string, unknown>[],
  filename: string,
  sheetName = 'Sheet1'
): Promise<void> {
  // Dynamically import xlsx to avoid SSR issues
  const XLSX = await import('xlsx')

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(data)

  // Auto-size columns
  const maxWidths: number[] = []
  data.forEach(row => {
    Object.values(row).forEach((val, idx) => {
      const len = String(val || '').length
      maxWidths[idx] = Math.max(maxWidths[idx] || 10, Math.min(len, 50))
    })
  })

  // Set column widths
  worksheet['!cols'] = maxWidths.map(w => ({ wch: w + 2 }))

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  // Generate and download
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

/**
 * Export flashcards to Excel
 */
export async function exportFlashcardsToExcel(
  flashcards: Flashcard[],
  filename = 'flashcards'
): Promise<void> {
  const data = flashcards.map((card, idx) => ({
    '#': idx + 1,
    'Question': card.front || card.question || '',
    'Answer': card.back || card.answer || ''
  }))

  await downloadAsExcel(data, filename, 'Flashcards')
}

/**
 * Export quiz to Excel
 */
export async function exportQuizToExcel(
  questions: QuizQuestion[],
  filename = 'quiz'
): Promise<void> {
  const data = questions.map((q, idx) => ({
    '#': idx + 1,
    'Question': q.question,
    'Option A': q.options[0] || '',
    'Option B': q.options[1] || '',
    'Option C': q.options[2] || '',
    'Option D': q.options[3] || '',
    'Correct Answer': String.fromCharCode(65 + q.correct_index), // A, B, C, D
    'Explanation': q.explanation
  }))

  await downloadAsExcel(data, filename, 'Quiz Questions')
}

/**
 * Export FAQ to Excel
 */
export async function exportFAQToExcel(
  items: FAQItem[],
  filename = 'faq'
): Promise<void> {
  const data = items.map((item, idx) => ({
    '#': idx + 1,
    'Question': item.question,
    'Answer': item.answer
  }))

  await downloadAsExcel(data, filename, 'FAQ')
}

// ============================================================================
// PDF Export
// ============================================================================

/**
 * Generate and download a PDF document
 */
export async function downloadAsPDF(
  content: PDFContent,
  filename: string
): Promise<void> {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - (margin * 2)
  let y = margin

  // Helper to check for page break
  const checkPageBreak = (height: number) => {
    if (y + height > pageHeight - margin) {
      doc.addPage()
      y = margin
      return true
    }
    return false
  }

  // Title
  if (content.title) {
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(51, 51, 51)
    const titleLines = doc.splitTextToSize(content.title, contentWidth)
    doc.text(titleLines, margin, y)
    y += titleLines.length * 10 + 10
  }

  // Subtitle
  if (content.subtitle) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(102, 102, 102)
    doc.text(content.subtitle, margin, y)
    y += 15
  }

  // Divider line
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 15

  // Sections
  if (content.sections) {
    for (const section of content.sections) {
      checkPageBreak(30)

      // Section heading
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(51, 51, 51)
      const headingLines = doc.splitTextToSize(section.heading, contentWidth)
      doc.text(headingLines, margin, y)
      y += headingLines.length * 7 + 5

      // Section content
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(68, 68, 68)

      const contentLines = doc.splitTextToSize(section.content, contentWidth)
      for (const line of contentLines) {
        checkPageBreak(6)
        doc.text(line, margin, y)
        y += 6
      }

      y += 10 // Space after section
    }
  }

  // Footer with page numbers
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
    doc.text(
      'Generated by NotebookLM Reimagined',
      margin,
      pageHeight - 10
    )
  }

  doc.save(`${filename}.pdf`)
}

interface PDFContent {
  title?: string
  subtitle?: string
  sections?: { heading: string; content: string }[]
}

/**
 * Export study guide to PDF
 */
export async function exportStudyGuideToPDF(
  guide: StudyGuide,
  filename = 'study-guide'
): Promise<void> {
  await downloadAsPDF(
    {
      title: guide.title,
      subtitle: `${guide.sections.length} sections • Generated study guide`,
      sections: guide.sections.map(section => ({
        heading: section.heading,
        content: section.content.replace(/\*\*/g, '').replace(/\*/g, '') // Strip markdown
      }))
    },
    filename
  )
}

/**
 * Export flashcards to PDF
 */
export async function exportFlashcardsToPDF(
  flashcards: Flashcard[],
  title = 'Flashcards',
  filename = 'flashcards'
): Promise<void> {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - (margin * 2)
  let y = margin

  // Title
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(51, 51, 51)
  doc.text(title, margin, y)
  y += 15

  // Subtitle
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(102, 102, 102)
  doc.text(`${flashcards.length} cards`, margin, y)
  y += 15

  // Cards
  flashcards.forEach((card, idx) => {
    // Check if we need a new page
    if (y + 50 > pageHeight - margin) {
      doc.addPage()
      y = margin
    }

    // Card container
    doc.setFillColor(245, 245, 245)
    doc.roundedRect(margin, y, contentWidth, 45, 3, 3, 'F')

    // Card number
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(102, 102, 102)
    doc.text(`Card ${idx + 1}`, margin + 5, y + 8)

    // Question
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(51, 51, 51)
    const question = card.front || card.question || ''
    const qLines = doc.splitTextToSize(`Q: ${question}`, contentWidth - 10)
    doc.text(qLines.slice(0, 2), margin + 5, y + 18)

    // Answer
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(68, 68, 68)
    const answer = card.back || card.answer || ''
    const aLines = doc.splitTextToSize(`A: ${answer}`, contentWidth - 10)
    doc.text(aLines.slice(0, 2), margin + 5, y + 32)

    y += 52
  })

  doc.save(`${filename}.pdf`)
}

/**
 * Export quiz to PDF
 */
export async function exportQuizToPDF(
  questions: QuizQuestion[],
  title = 'Quiz',
  filename = 'quiz'
): Promise<void> {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - (margin * 2)
  let y = margin

  // Title
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(51, 51, 51)
  doc.text(title, margin, y)
  y += 15

  // Subtitle
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(102, 102, 102)
  doc.text(`${questions.length} questions`, margin, y)
  y += 15

  // Questions
  questions.forEach((q, idx) => {
    // Check if we need a new page
    if (y + 60 > pageHeight - margin) {
      doc.addPage()
      y = margin
    }

    // Question number and text
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(51, 51, 51)
    const qLines = doc.splitTextToSize(`${idx + 1}. ${q.question}`, contentWidth)
    doc.text(qLines, margin, y)
    y += qLines.length * 6 + 4

    // Options
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    q.options.forEach((opt, optIdx) => {
      const isCorrect = optIdx === q.correct_index
      doc.setTextColor(isCorrect ? 34 : 68, isCorrect ? 139 : 68, isCorrect ? 34 : 68)
      const optLine = `${String.fromCharCode(65 + optIdx)}) ${opt}${isCorrect ? ' ✓' : ''}`
      const optLines = doc.splitTextToSize(optLine, contentWidth - 10)
      doc.text(optLines, margin + 5, y)
      y += optLines.length * 5 + 2
    })

    // Explanation
    if (q.explanation) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(102, 102, 102)
      const expLines = doc.splitTextToSize(`💡 ${q.explanation}`, contentWidth - 10)
      doc.text(expLines.slice(0, 2), margin + 5, y + 2)
      y += Math.min(expLines.length, 2) * 4 + 4
    }

    y += 10
  })

  doc.save(`${filename}.pdf`)
}

/**
 * Export FAQ to PDF
 */
export async function exportFAQToPDF(
  items: FAQItem[],
  title = 'Frequently Asked Questions',
  filename = 'faq'
): Promise<void> {
  await downloadAsPDF(
    {
      title,
      subtitle: `${items.length} questions`,
      sections: items.map((item, idx) => ({
        heading: `Q${idx + 1}: ${item.question}`,
        content: item.answer
      }))
    },
    filename
  )
}

// ============================================================================
// Image (PNG) Export
// ============================================================================

/**
 * Export SVG element to PNG
 */
export async function exportSVGToPNG(
  svgElement: SVGSVGElement,
  filename: string,
  options: { scale?: number; backgroundColor?: string } = {}
): Promise<void> {
  const { scale = 2, backgroundColor = '#1a1a2e' } = options

  // Get SVG dimensions
  const bbox = svgElement.getBBox()
  const viewBox = svgElement.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 800, 600]
  const width = viewBox[2] || bbox.width
  const height = viewBox[3] || bbox.height

  // Create canvas
  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Could not get canvas context')
  }

  // Fill background
  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.scale(scale, scale)

  // Convert SVG to image
  const svgData = new XMLSerializer().serializeToString(svgElement)
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(svgUrl)

      // Download
      const link = document.createElement('a')
      link.download = `${filename}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      resolve()
    }
    img.onerror = reject
    img.src = svgUrl
  })
}

/**
 * Export Mind Map to PNG
 * Takes the SVG element from the mind map viewer and converts to PNG
 */
export async function exportMindMapToPNG(
  svgElement: SVGSVGElement,
  title: string,
  filename = 'mind-map'
): Promise<void> {
  await exportSVGToPNG(svgElement, filename, {
    scale: 2,
    backgroundColor: '#1e1e2e'
  })
}

// ============================================================================
// Generic Utilities
// ============================================================================

/**
 * Generate a timestamped filename
 */
export function generateFilename(base: string): string {
  const date = new Date()
  const timestamp = date.toISOString().slice(0, 10).replace(/-/g, '')
  return `${base}_${timestamp}`
}

/**
 * Trigger file download from blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
