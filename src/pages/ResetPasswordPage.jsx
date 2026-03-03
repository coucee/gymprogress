import { Dumbbell, KeyRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx'
import { Input } from '../components/ui/input.jsx'
import { Label } from '../components/ui/label.jsx'
import { supabase } from '../lib/supabase.js'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setHasRecoverySession(Boolean(data.session))
      setCheckingSession(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasRecoverySession(Boolean(session))
      setCheckingSession(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setMessage('Password updated. Redirecting to login...')
    setLoading(false)
    setTimeout(() => navigate('/login', { replace: true }), 1200)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-1 flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-blue-600" />
            <CardTitle className="text-2xl">GymProgress</CardTitle>
          </div>
          <p className="text-sm text-slate-600">Set a new password</p>
        </CardHeader>
        <CardContent>
          {checkingSession ? (
            <p className="text-sm text-slate-600">Checking reset session...</p>
          ) : !hasRecoverySession ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">
                Open this page from your reset email link to set a new password.
              </p>
              <Link className="text-sm font-medium text-blue-700 hover:text-blue-800" to="/forgot-password">
                Request new reset email
              </Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  minLength={6}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  minLength={6}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat password"
                />
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

              <Button className="w-full" type="submit" disabled={loading}>
                <KeyRound className="h-4 w-4" />
                {loading ? 'Saving...' : 'Update password'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
