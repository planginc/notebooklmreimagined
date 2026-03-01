'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeftOpen, PanelRightOpen, BookOpen, MessageSquare, Sparkles } from 'lucide-react';
import { useState, useRef, useCallback, useEffect } from 'react';

import { Button } from '@/components/ui/button';

interface ThreePanelLayoutProps {
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  leftPanelTitle?: string;
  rightPanelTitle?: string;
  defaultLeftWidth?: number;
  defaultRightWidth?: number;
  minLeftWidth?: number;
  minRightWidth?: number;
  maxLeftWidth?: number;
  maxRightWidth?: number;
}

type MobilePanel = 'sources' | 'chat' | 'studio';

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setIsMobile(mql.matches);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}

export function ThreePanelLayout({
  leftPanel,
  centerPanel,
  rightPanel,
  leftPanelTitle = 'Sources',
  rightPanelTitle = 'Studio',
  defaultLeftWidth = 320,
  defaultRightWidth = 340,
  minLeftWidth = 240,
  minRightWidth = 280,
  maxLeftWidth = 500,
  maxRightWidth = 480,
}: ThreePanelLayoutProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [rightWidth, setRightWidth] = useState(defaultRightWidth);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [activePanel, setActivePanel] = useState<MobilePanel>('chat');

  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();

      if (isResizingLeft) {
        const newWidth = e.clientX - containerRect.left;
        if (newWidth >= minLeftWidth && newWidth <= maxLeftWidth) {
          setLeftWidth(newWidth);
        }
      }

      if (isResizingRight) {
        const newWidth = containerRect.right - e.clientX;
        if (newWidth >= minRightWidth && newWidth <= maxRightWidth) {
          setRightWidth(newWidth);
        }
      }
    },
    [isResizingLeft, isResizingRight, minLeftWidth, maxLeftWidth, minRightWidth, maxRightWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizingLeft(false);
    setIsResizingRight(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    if (isResizingLeft || isResizingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight, handleMouseMove, handleMouseUp]);

  // Mobile layout: single panel with bottom tab bar
  if (isMobile) {
    const tabs: { key: MobilePanel; label: string; icon: React.ReactNode }[] = [
      { key: 'sources', label: leftPanelTitle, icon: <BookOpen className="h-5 w-5" /> },
      { key: 'chat', label: 'Chat', icon: <MessageSquare className="h-5 w-5" /> },
      { key: 'studio', label: rightPanelTitle, icon: <Sparkles className="h-5 w-5" /> },
    ];

    return (
      <div className="flex h-full flex-col overflow-hidden">
        {/* Active panel content */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePanel}
              initial={{
                opacity: 0,
                x: activePanel === 'sources' ? -20 : activePanel === 'studio' ? 20 : 0,
              }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full overflow-hidden"
            >
              {activePanel === 'sources' && (
                <div className="flex h-full flex-col bg-[var(--bg-secondary)]">
                  <div className="flex h-12 shrink-0 items-center border-b border-[var(--border)] px-4">
                    <h2 className="font-semibold text-[var(--text-primary)]">{leftPanelTitle}</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto">{leftPanel}</div>
                </div>
              )}
              {activePanel === 'chat' && (
                <div className="flex h-full flex-col overflow-hidden bg-[var(--bg-primary)]">
                  {centerPanel}
                </div>
              )}
              {activePanel === 'studio' && (
                <div className="flex h-full flex-col bg-[var(--bg-secondary)]">
                  <div className="flex h-12 shrink-0 items-center border-b border-[var(--border)] px-4">
                    <h2 className="font-semibold text-[var(--text-primary)]">{rightPanelTitle}</h2>
                  </div>
                  <div className="flex-1 overflow-hidden">{rightPanel}</div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom tab bar */}
        <div className="mobile-bottom-bar shrink-0 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="flex items-center justify-around py-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActivePanel(tab.key)}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 transition-colors ${
                  activePanel === tab.key
                    ? 'text-[var(--accent-primary)]'
                    : 'text-[var(--text-tertiary)] active:text-[var(--text-secondary)]'
                }`}
              >
                {tab.icon}
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout: three resizable panels (unchanged)
  return (
    <div ref={containerRef} className="flex h-full overflow-hidden">
      {/* Left Panel */}
      <AnimatePresence initial={false}>
        {leftCollapsed ? (
          <motion.div
            initial={{ width: leftWidth }}
            animate={{ width: 48 }}
            exit={{ width: leftWidth }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex h-full flex-col items-center border-r border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)] py-4"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLeftCollapsed(false)}
              className="h-8 w-8 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ width: 48 }}
            animate={{ width: leftWidth }}
            exit={{ width: 48 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex h-full flex-col border-r border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)]"
            style={{ minWidth: minLeftWidth }}
          >
            {/* Panel Header */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-[rgba(255,255,255,0.1)] px-4">
              <h2 className="font-semibold text-[var(--text-primary)]">{leftPanelTitle}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLeftCollapsed(true)}
                className="h-8 w-8 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              >
                <PanelLeftOpen className="h-4 w-4 rotate-180" />
              </Button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-x-visible overflow-y-auto">{leftPanel}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Resize Handle */}
      {!leftCollapsed && (
        <div
          className="w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-[var(--accent-primary)]/50"
          onMouseDown={() => setIsResizingLeft(true)}
        />
      )}

      {/* Center Panel */}
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-[var(--bg-primary)]">
        {centerPanel}
      </div>

      {/* Right Resize Handle */}
      {!rightCollapsed && (
        <div
          className="w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-[var(--accent-primary)]/50"
          onMouseDown={() => setIsResizingRight(true)}
        />
      )}

      {/* Right Panel */}
      <AnimatePresence initial={false}>
        {rightCollapsed ? (
          <motion.div
            initial={{ width: rightWidth }}
            animate={{ width: 48 }}
            exit={{ width: rightWidth }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex h-full flex-col items-center border-l border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)] py-4"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRightCollapsed(false)}
              className="h-8 w-8 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              <PanelRightOpen className="h-4 w-4" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ width: 48 }}
            animate={{ width: rightWidth }}
            exit={{ width: 48 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex h-full flex-col border-l border-[rgba(255,255,255,0.1)] bg-[var(--bg-secondary)]"
            style={{ minWidth: minRightWidth }}
          >
            {/* Panel Header */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-[rgba(255,255,255,0.1)] px-4">
              <h2 className="font-semibold text-[var(--text-primary)]">{rightPanelTitle}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRightCollapsed(true)}
                className="h-8 w-8 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              >
                <PanelRightOpen className="h-4 w-4 rotate-180" />
              </Button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-hidden">{rightPanel}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
