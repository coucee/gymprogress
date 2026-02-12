import { format, parseISO } from 'date-fns'
import { ArrowLeft, ChartSpline, LogOut } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '../components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx'
import { MobileBottomNav } from '../components/MobileBottomNav.jsx'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../state/AuthContext.jsx'

export function ExerciseProgressPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [exercises, setExercises] = useState([])
  const [selectedExerciseId, setSelectedExerciseId] = useState('')
  const [chartData, setChartData] = useState([])
  const [chartLoading, setChartLoading] = useState(false)
  const [chartError, setChartError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadExercises() {
      if (!user) return
      setLoading(true)
      setError('')

      const { data, error: exerciseError } = await supabase.from('exercises').select('id,name').order('name')

      if (!mounted) return

      if (exerciseError) {
        setError(exerciseError.message)
        setLoading(false)
        return
      }

      const list = data ?? []
      setExercises(list)
      if (list.length > 0) {
        setSelectedExerciseId(String(list[0].id))
      }
      setLoading(false)
    }

    loadExercises()

    return () => {
      mounted = false
    }
  }, [user])

  useEffect(() => {
    let mounted = true

    async function loadExerciseProgress() {
      if (!user || !selectedExerciseId) return

      setChartLoading(true)
      setChartError('')

      const { data: sessions, error: sessionError } = await supabase
        .from('workout_sessions')
        .select('id,session_date')
        .eq('user_id', user.id)
        .order('session_date', { ascending: true })

      if (!mounted) return

      if (sessionError) {
        setChartError(sessionError.message)
        setChartLoading(false)
        return
      }

      const sessionRows = sessions ?? []
      if (sessionRows.length === 0) {
        setChartData([])
        setChartLoading(false)
        return
      }

      const sessionIds = sessionRows.map((session) => session.id)
      const sessionDateMap = new Map(sessionRows.map((session) => [session.id, session.session_date]))

      const { data: setRows, error: setError } = await supabase
        .from('workout_sets')
        .select('session_id,weight_kg,reps')
        .eq('exercise_id', Number(selectedExerciseId))
        .in('session_id', sessionIds)

      if (!mounted) return

      if (setError) {
        setChartError(setError.message)
        setChartLoading(false)
        return
      }

      const dayMap = new Map()
      for (const row of setRows ?? []) {
        const date = sessionDateMap.get(row.session_id)
        if (!date) continue

        const weight = Number(row.weight_kg)
        const reps = Number(row.reps)
        const estimatedOneRepMax = weight * (1 + reps / 30)
        const existing = dayMap.get(date) ?? { date, maxWeight: 0, estimatedOneRepMax: 0 }

        existing.maxWeight = Math.max(existing.maxWeight, weight)
        existing.estimatedOneRepMax = Math.max(existing.estimatedOneRepMax, estimatedOneRepMax)
        dayMap.set(date, existing)
      }

      const nextData = [...dayMap.values()]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((point) => ({
          ...point,
          label: format(parseISO(point.date), 'MMM d'),
          maxWeight: round1(point.maxWeight),
          estimatedOneRepMax: round1(point.estimatedOneRepMax),
        }))

      setChartData(nextData)
      setChartLoading(false)
    }

    loadExerciseProgress()

    return () => {
      mounted = false
    }
  }, [selectedExerciseId, user])

  const selectedExerciseName = useMemo(() => {
    const found = exercises.find((exercise) => String(exercise.id) === selectedExerciseId)
    return found?.name ?? 'Exercise'
  }, [exercises, selectedExerciseId])

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">Loading progress...</div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-3 py-3 sm:px-4">
          <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Exercise Progress</h1>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} type="button">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-4 px-3 py-4 pb-24 sm:px-4 sm:py-6 md:grid-cols-[280px_1fr] md:pb-6">
        {error ? (
          <Card className="border-red-300 bg-red-50 md:col-span-2">
            <CardContent className="p-4 text-red-700">{error}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-slate-500">Exercises</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {exercises.length === 0 ? (
              <p className="text-sm text-slate-600">No exercises yet. Add one on the dashboard.</p>
            ) : (
              exercises.map((exercise) => {
                const active = String(exercise.id) === selectedExerciseId
                return (
                  <Button
                    className="w-full justify-start"
                    key={exercise.id}
                    onClick={() => setSelectedExerciseId(String(exercise.id))}
                    type="button"
                    variant={active ? 'default' : 'outline'}
                  >
                    {exercise.name}
                  </Button>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-slate-800">
              <ChartSpline className="h-4 w-4" />
              <CardTitle>{selectedExerciseName} Trend</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {chartError ? <p className="text-sm text-red-700">{chartError}</p> : null}

            {chartLoading ? (
              <p className="text-sm text-slate-600">Loading chart...</p>
            ) : chartData.length === 0 ? (
              <p className="text-sm text-slate-600">No logged sets for this exercise yet.</p>
            ) : (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="label" minTickGap={24} tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} width={40} />
                    <Tooltip
                      formatter={(value, name) =>
                        name === 'estimatedOneRepMax'
                          ? [`${value} kg`, 'Estimated 1RM']
                          : [`${value} kg`, 'Max Weight']
                      }
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ''}
                    />
                    <Line
                      type="monotone"
                      dataKey="estimatedOneRepMax"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="maxWeight"
                      stroke="#059669"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <MobileBottomNav />
    </div>
  )
}

function round1(value) {
  return Math.round(value * 10) / 10
}
