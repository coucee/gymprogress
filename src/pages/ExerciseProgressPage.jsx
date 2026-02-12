import { format, parseISO } from 'date-fns'
import { ArrowLeft, ChartSpline, LogOut } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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

      const { data, error: exerciseError } = await supabase
        .from('exercises')
        .select('id,name')
        .order('name')

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
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-semibold text-slate-900">Exercise Progress</h1>
          <div className="flex items-center gap-2">
            <Link
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              to="/dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={handleLogout}
              type="button"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:grid-cols-[280px_1fr]">
        {error ? (
          <section className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-700 md:col-span-2">
            {error}
          </section>
        ) : null}

        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Exercises</h2>
          <div className="space-y-2">
            {exercises.length === 0 ? (
              <p className="text-sm text-slate-600">No exercises yet. Add one on the dashboard.</p>
            ) : (
              exercises.map((exercise) => {
                const active = String(exercise.id) === selectedExerciseId
                return (
                  <button
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                    key={exercise.id}
                    onClick={() => setSelectedExerciseId(String(exercise.id))}
                    type="button"
                  >
                    {exercise.name}
                  </button>
                )
              })
            )}
          </div>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-slate-800">
            <ChartSpline className="h-4 w-4" />
            <h2 className="font-medium">{selectedExerciseName} Trend</h2>
          </div>

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
        </section>
      </main>
    </div>
  )
}

function round1(value) {
  return Math.round(value * 10) / 10
}
