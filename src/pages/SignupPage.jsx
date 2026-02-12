import { Dumbbell, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx'
import { Input } from '../components/ui/input.jsx'
import { Label } from '../components/ui/label.jsx'
import { useAuth } from '../state/AuthContext.jsx'

export function SignupPage() {
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    const { error: signUpError } = await signUp({ email, password })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    setMessage('Account created. If email confirmation is enabled, check your inbox.')
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
          <p className="text-sm text-slate-600">Create account</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 6 characters"
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

            <Button className="w-full" type="submit" disabled={loading}>
              <UserPlus className="h-4 w-4" />
              {loading ? 'Creating account...' : 'Sign up'}
            </Button>
          </form>

          <p className="mt-4 text-sm text-slate-600">
            Already have an account?{' '}
            <Link className="font-medium text-blue-700 hover:text-blue-800" to="/login">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
