'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Settings, Bell, User, LogOut, Key } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeSelector } from '@/components/ui/theme-selector'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  email: string
}

interface DashboardHeaderProps {
  user: SupabaseUser | null
  searchQuery: string
  onSearchChange: (query: string) => void
  onLogout: () => void
}

export function DashboardHeader({
  user,
  searchQuery,
  onSearchChange,
  onLogout,
}: DashboardHeaderProps) {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    async function loadProfile() {
      if (!user) return

      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://notebooklm-api.vercel.app'
        const response = await fetch(`${apiUrl}/api/v1/profile`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setProfile(data)
        }
      } catch (error) {
        console.error('Failed to load profile:', error)
      }
    }

    loadProfile()
  }, [user])

  // Use profile display_name if available, otherwise fall back to email
  const displayName = profile?.display_name || user?.email || 'User'

  // Generate initials from display name (supports first+last name)
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U'

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-16 bg-[var(--bg-secondary)] border-b border-[var(--border)] px-6 flex items-center justify-between sticky top-0 z-50"
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] via-[var(--accent-secondary)] to-[var(--accent-tertiary)] p-0.5 shadow-lg shadow-[var(--accent-primary)]/20">
          <div className="w-full h-full rounded-[10px] bg-[var(--bg-primary)] flex items-center justify-center relative overflow-hidden">
            {/* Neural network lines */}
            <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 40 40">
              <circle cx="12" cy="12" r="2" fill="currentColor" className="text-[var(--accent-primary)]" />
              <circle cx="28" cy="12" r="2" fill="currentColor" className="text-[var(--accent-secondary)]" />
              <circle cx="20" cy="28" r="2" fill="currentColor" className="text-[var(--accent-tertiary)]" />
              <line x1="12" y1="12" x2="28" y2="12" stroke="currentColor" strokeWidth="1" className="text-[var(--accent-primary)]" />
              <line x1="12" y1="12" x2="20" y2="28" stroke="currentColor" strokeWidth="1" className="text-[var(--accent-secondary)]" />
              <line x1="28" y1="12" x2="20" y2="28" stroke="currentColor" strokeWidth="1" className="text-[var(--accent-tertiary)]" />
            </svg>
            {/* Main icon - stylized notebook with sparkle */}
            <svg className="w-6 h-6 relative z-10" viewBox="0 0 24 24" fill="none">
              {/* Notebook body */}
              <rect x="5" y="3" width="14" height="18" rx="2" className="stroke-[var(--accent-primary)]" strokeWidth="1.5" fill="none" />
              {/* Notebook lines */}
              <line x1="8" y1="8" x2="16" y2="8" className="stroke-[var(--accent-secondary)]" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="8" y1="12" x2="14" y2="12" className="stroke-[var(--accent-secondary)]" strokeWidth="1.5" strokeLinecap="round" />
              {/* AI sparkle */}
              <path d="M18 2l.5 1.5L20 4l-1.5.5L18 6l-.5-1.5L16 4l1.5-.5L18 2z" className="fill-[var(--accent-tertiary)]" />
              <path d="M20 15l.35 1L21.5 16.35l-1.15.35L20 17.85l-.35-1.15L18.5 16.35l1.15-.35L20 15z" className="fill-[var(--accent-primary)]" />
            </svg>
          </div>
        </div>
        <span className="text-lg font-semibold text-[var(--text-primary)] hidden sm:inline">
          NotebookLM Reimagined
        </span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md mx-8 hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <Input
            placeholder="Search notebooks..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-10 bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] rounded-xl"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Theme Selector */}
        <ThemeSelector />

        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
        >
          <Bell className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
          onClick={() => router.push('/settings')}
          title="Settings & API Keys"
        >
          <Settings className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-10 gap-2 px-2 rounded-xl hover:bg-[var(--bg-tertiary)]"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || ''} alt={displayName} />
                <AvatarFallback className="bg-[var(--accent-primary)] text-white text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-[var(--text-secondary)] hidden lg:inline max-w-[120px] truncate">
                {displayName}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-[var(--bg-secondary)] border-[var(--border)]"
          >
            <div className="px-2 py-2">
              <p className="text-sm font-medium text-[var(--text-primary)]">{displayName}</p>
              <p className="text-xs text-[var(--text-tertiary)]">Free Plan</p>
            </div>
            <DropdownMenuSeparator className="bg-[var(--border)]" />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => router.push('/profile')}
            >
              <User className="h-4 w-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => router.push('/settings')}
            >
              <Key className="h-4 w-4 mr-2" />
              API Keys
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => router.push('/settings')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[var(--border)]" />
            <DropdownMenuItem
              onClick={onLogout}
              className="cursor-pointer text-[var(--error)] focus:text-[var(--error)]"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.header>
  )
}
