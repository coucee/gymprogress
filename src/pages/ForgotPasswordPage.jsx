import { Dumbbell, KeyRound } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx'
import { Input } from '../components/ui/input.jsx'
import { Label } from '../components/ui/label.jsx'
import { supabase } from '../lib/supabase.js'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setMessage('If this email exists, a password reset link was sent.')
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-1 flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-blue-600" />
            <CardTitle className="text-2xl">GymProgress</CardTitle>
          </div>
          <p className="text-sm text-slate-600">Reset your password</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

            <Button className="w-full" type="submit" disabled={loading}>
              <KeyRound className="h-4 w-4" />
              {loading ? 'Sending...' : 'Send reset email'}
            </Button>
          </form>

          <p className="mt-4 text-sm text-slate-600">
            Remembered it?{' '}
            <Link className="font-medium text-blue-700 hover:text-blue-800" to="/login">
              Back to login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
