'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ErrorDialog, SuccessDialog } from '@/components/ui/error-dialog'
import { User, ArrowLeft, Loader2 } from 'lucide-react'

interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  email: string
  created_at: string | null
}

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [displayName, setDisplayName] = useState('')

  // Dialog state
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; title: string; message: string; details?: string }>({
    open: false, title: '', message: ''
  })
  const [successDialog, setSuccessDialog] = useState<{ open: boolean; title: string; message: string }>({
    open: false, title: '', message: ''
  })

  const showError = (title: string, message: string, details?: string) => {
    setErrorDialog({ open: true, title, message, details })
  }

  const showSuccess = (title: string, message: string) => {
    setSuccessDialog({ open: true, title, message })
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://notebooklm-api.vercel.app'

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(`${apiUrl}/api/v1/profile`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        setDisplayName(data.display_name || '')
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
      showError('Load Failed', 'Failed to load your profile. Please try again.', String(error))
    } finally {
      setLoading(false)
    }
  }

  async function saveProfile() {
    if (!displayName.trim()) {
      showError('Validation Error', 'Display name cannot be empty. Please enter a name.')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(`${apiUrl}/api/v1/profile`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ display_name: displayName.trim() }),
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        showSuccess('Profile Updated', 'Your profile has been updated successfully.')
      } else {
        const errorData = await response.json().catch(() => ({}))
        showError('Update Failed', 'Failed to update your profile.', errorData.detail || `Status: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
      showError('Update Failed', 'An error occurred while saving your profile.', String(error))
    } finally {
      setSaving(false)
    }
  }

  const initials = (profile?.display_name || profile?.email || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#7c3aed]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e]">
      {/* Header */}
      <header className="border-b border-[rgba(255,255,255,0.1)] bg-[#0f0f1a]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.1)]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#7c3aed]/20">
              <User className="h-5 w-5 text-[#7c3aed]" />
            </div>
            <h1 className="text-xl font-semibold text-white">Profile</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-[#0f0f1a] border border-[rgba(255,255,255,0.1)] rounded-lg p-6">
          <h2 className="text-lg font-medium text-white mb-6">Profile Settings</h2>

          <div className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-[#7c3aed] text-white text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-gray-400">Avatar</p>
                <p className="text-xs text-gray-500 mt-1">Avatar is generated from your display name initials</p>
              </div>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Display Name</label>
              <div className="flex gap-3">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  className="max-w-md bg-[rgba(0,0,0,0.3)] border-[rgba(255,255,255,0.1)] text-white"
                />
                <Button
                  onClick={saveProfile}
                  disabled={saving || displayName === profile?.display_name}
                  className="bg-[#7c3aed] hover:bg-[#6d28d9]"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Email</label>
              <p className="text-white">{profile?.email}</p>
            </div>

            {/* Member since */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Member since</label>
              <p className="text-white">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Error Dialog */}
      <ErrorDialog
        open={errorDialog.open}
        onClose={() => setErrorDialog({ ...errorDialog, open: false })}
        title={errorDialog.title}
        message={errorDialog.message}
        details={errorDialog.details}
      />

      {/* Success Dialog */}
      <SuccessDialog
        open={successDialog.open}
        onClose={() => setSuccessDialog({ ...successDialog, open: false })}
        title={successDialog.title}
        message={successDialog.message}
      />
    </div>
  )
}
