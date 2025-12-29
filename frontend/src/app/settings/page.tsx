'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { apiKeysApi, ApiKey, ApiKeyWithSecret } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
  Settings,
  ArrowLeft,
  RefreshCw,
  BookOpen,
} from 'lucide-react'
import { toast } from 'sonner'

const API_KEY_SCOPES = [
  { value: '*', label: 'Full Access', description: 'Access to all operations' },
  { value: 'read', label: 'Read Only', description: 'Can only read data, no modifications' },
  { value: 'notebooks', label: 'Notebooks', description: 'Manage notebooks' },
  { value: 'sources', label: 'Sources', description: 'Upload and manage sources' },
  { value: 'chat', label: 'Chat', description: 'Send chat messages' },
  { value: 'audio', label: 'Audio', description: 'Generate audio overviews' },
  { value: 'video', label: 'Video', description: 'Generate video content' },
  { value: 'research', label: 'Research', description: 'Run deep research tasks' },
  { value: 'study', label: 'Study', description: 'Generate study materials' },
  { value: 'notes', label: 'Notes', description: 'Manage notes' },
]

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newKeyDialogOpen, setNewKeyDialogOpen] = useState(false)
  const [newKeySecret, setNewKeySecret] = useState('')
  const [copied, setCopied] = useState(false)
  const [creating, setCreating] = useState(false)

  // Create form state
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyDescription, setNewKeyDescription] = useState('')
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['*'])
  const [newKeyRpm, setNewKeyRpm] = useState(60)
  const [newKeyRpd, setNewKeyRpd] = useState(10000)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuthAndLoadKeys()
  }, [])

  async function checkAuthAndLoadKeys() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }
    await loadApiKeys()
  }

  async function loadApiKeys() {
    setLoading(true)
    try {
      const response = await apiKeysApi.list()
      setApiKeys(response.data)
    } catch (error) {
      console.error('Failed to load API keys:', error)
      toast.error('Failed to load API keys')
    }
    setLoading(false)
  }

  async function createApiKey() {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key')
      return
    }

    setCreating(true)
    try {
      const response = await apiKeysApi.create({
        name: newKeyName,
        description: newKeyDescription || undefined,
        scopes: newKeyScopes,
        rate_limit_rpm: newKeyRpm,
        rate_limit_rpd: newKeyRpd,
      })

      // Show the secret key dialog
      setNewKeySecret(response.data.key)
      setCreateDialogOpen(false)
      setNewKeyDialogOpen(true)

      // Reset form
      setNewKeyName('')
      setNewKeyDescription('')
      setNewKeyScopes(['*'])
      setNewKeyRpm(60)
      setNewKeyRpd(10000)

      // Reload keys
      await loadApiKeys()
    } catch (error) {
      console.error('Failed to create API key:', error)
      toast.error('Failed to create API key')
    }
    setCreating(false)
  }

  async function revokeApiKey(keyId: string, keyName: string) {
    if (!confirm(`Are you sure you want to revoke "${keyName}"? This action cannot be undone.`)) {
      return
    }

    try {
      await apiKeysApi.revoke(keyId)
      setApiKeys(apiKeys.filter(k => k.id !== keyId))
      toast.success('API key revoked')
    } catch (error) {
      console.error('Failed to revoke API key:', error)
      toast.error('Failed to revoke API key')
    }
  }

  async function toggleApiKey(keyId: string, isActive: boolean) {
    try {
      await apiKeysApi.update(keyId, { is_active: !isActive })
      setApiKeys(apiKeys.map(k =>
        k.id === keyId ? { ...k, is_active: !isActive } : k
      ))
      toast.success(isActive ? 'API key disabled' : 'API key enabled')
    } catch (error) {
      console.error('Failed to update API key:', error)
      toast.error('Failed to update API key')
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e]">
      {/* Header */}
      <header className="border-b border-[rgba(255,255,255,0.1)] bg-[#0f0f1a]">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/')}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <Settings className="h-6 w-6 text-[#7c3aed]" />
                <h1 className="text-2xl font-bold text-white">Settings</h1>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/docs')}
              className="border-[rgba(255,255,255,0.1)] text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              API Documentation
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <Tabs defaultValue="api-keys" className="space-y-6">
          <TabsList className="bg-[#0f0f1a] border border-[rgba(255,255,255,0.1)]">
            <TabsTrigger value="api-keys" className="gap-2 data-[state=active]:bg-[#7c3aed] data-[state=active]:text-white">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api-keys" className="space-y-6">
            {/* API Keys Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">API Keys</h2>
                <p className="text-gray-400 mt-1">
                  Manage API keys for programmatic access to Open NotebookLM
                </p>
              </div>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create API Key
              </Button>
            </div>

            {/* Usage Example */}
            <div className="bg-[#0f0f1a] border border-[rgba(255,255,255,0.1)] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-white">Quick Start</h3>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => router.push('/docs')}
                  className="text-[#7c3aed] hover:text-[#a78bfa] px-0"
                >
                  View Full Documentation →
                </Button>
              </div>
              <p className="text-gray-400 text-sm mb-3">
                Use your API key with the <code className="bg-[rgba(255,255,255,0.1)] px-1.5 py-0.5 rounded text-[#7c3aed]">X-API-Key</code> header:
              </p>
              <pre className="bg-[rgba(0,0,0,0.3)] p-3 rounded text-sm text-gray-300 overflow-x-auto">
{`curl -X POST http://localhost:8000/api/v1/notebooks/{id}/chat \\
  -H "X-API-Key: nb_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "What are the key findings?"}'`}
              </pre>
            </div>

            {/* API Keys List */}
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-12 text-gray-400">
                  <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin" />
                  Loading API keys...
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="bg-[#0f0f1a] border border-[rgba(255,255,255,0.1)] rounded-lg py-12 text-center">
                  <Key className="h-12 w-12 mx-auto text-gray-600 mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    No API Keys
                  </h3>
                  <p className="text-gray-400 mb-4">
                    Create an API key to access Open NotebookLM programmatically
                  </p>
                  <Button
                    onClick={() => setCreateDialogOpen(true)}
                    className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First API Key
                  </Button>
                </div>
              ) : (
                apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="bg-[#0f0f1a] border border-[rgba(255,255,255,0.1)] rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${key.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
                        <h3 className="text-lg font-medium text-white">
                          {key.name}
                        </h3>
                        {!key.is_active && (
                          <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                            Disabled
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleApiKey(key.id, key.is_active)}
                          className="text-gray-400 hover:text-white"
                          title={key.is_active ? 'Disable key' : 'Enable key'}
                        >
                          {key.is_active ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeApiKey(key.id, key.name)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          title="Revoke key"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {key.description && (
                      <p className="text-gray-400 text-sm mb-3">{key.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm mb-3">
                      <div className="font-mono bg-[rgba(255,255,255,0.05)] px-3 py-1.5 rounded text-gray-400">
                        {key.key_prefix}
                      </div>
                      <div className="text-gray-500">
                        Created: {formatDate(key.created_at)}
                      </div>
                      <div className="text-gray-500">
                        Last used: {formatDate(key.last_used_at)}
                      </div>
                      <div className="text-gray-500">
                        {key.total_requests.toLocaleString()} requests
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {key.scopes.map((scope) => (
                        <Badge
                          key={scope}
                          variant="secondary"
                          className="bg-[rgba(124,58,237,0.2)] text-[#a78bfa] border-0"
                        >
                          {scope === '*' ? 'Full Access' : scope}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Create API Key Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-[#0f0f1a] border-[rgba(255,255,255,0.1)] text-white">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription className="text-gray-400">
              Create a new API key for programmatic access. The key will only be shown once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Name *</label>
              <Input
                placeholder="My API Key"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)] text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                Description <span className="text-gray-500">(optional)</span>
              </label>
              <Textarea
                placeholder="What is this key for?"
                value={newKeyDescription}
                onChange={(e) => setNewKeyDescription(e.target.value)}
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)] text-white placeholder:text-gray-500"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Permissions</label>
              <div className="grid grid-cols-2 gap-2">
                {API_KEY_SCOPES.map((scope) => (
                  <label
                    key={scope.value}
                    className="flex items-center gap-2 p-2 rounded bg-[rgba(255,255,255,0.05)] cursor-pointer hover:bg-[rgba(255,255,255,0.08)]"
                  >
                    <Checkbox
                      checked={newKeyScopes.includes(scope.value)}
                      onCheckedChange={(checked) => {
                        if (scope.value === '*') {
                          setNewKeyScopes(checked ? ['*'] : [])
                        } else {
                          if (checked) {
                            setNewKeyScopes([...newKeyScopes.filter(s => s !== '*'), scope.value])
                          } else {
                            setNewKeyScopes(newKeyScopes.filter(s => s !== scope.value))
                          }
                        }
                      }}
                      className="border-gray-500 data-[state=checked]:bg-[#7c3aed] data-[state=checked]:border-[#7c3aed]"
                    />
                    <div>
                      <span className="text-sm text-white">{scope.label}</span>
                      <p className="text-xs text-gray-500">{scope.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">
                  Rate Limit (per minute)
                </label>
                <Input
                  type="number"
                  value={newKeyRpm}
                  onChange={(e) => setNewKeyRpm(parseInt(e.target.value) || 60)}
                  className="bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)] text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">
                  Rate Limit (per day)
                </label>
                <Input
                  type="number"
                  value={newKeyRpd}
                  onChange={(e) => setNewKeyRpd(parseInt(e.target.value) || 10000)}
                  className="bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)] text-white"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              className="border-[rgba(255,255,255,0.1)] text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]"
            >
              Cancel
            </Button>
            <Button
              onClick={createApiKey}
              disabled={!newKeyName.trim() || creating}
              className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white"
            >
              {creating ? 'Creating...' : 'Create Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Key Secret Dialog */}
      <Dialog open={newKeyDialogOpen} onOpenChange={setNewKeyDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-[#0f0f1a] border-[rgba(255,255,255,0.1)] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Save Your API Key
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              This is the only time you will see this key. Copy and store it securely.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="relative">
              <pre className="bg-[rgba(0,0,0,0.3)] p-4 rounded-lg text-sm font-mono text-white overflow-x-auto break-all whitespace-pre-wrap">
                {newKeySecret}
              </pre>
              <Button
                size="sm"
                className="absolute top-2 right-2 bg-[#7c3aed] hover:bg-[#6d28d9]"
                onClick={() => copyToClipboard(newKeySecret)}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
              <p className="text-sm text-yellow-200">
                <strong>Important:</strong> Store this key securely. You won&apos;t be able to see it again.
                If you lose it, you&apos;ll need to create a new one.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setNewKeyDialogOpen(false)
                setNewKeySecret('')
              }}
              className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white"
            >
              I&apos;ve Saved My Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
