import { format, parseISO, subDays } from 'date-fns'
import { Activity, ChartSpline, LogOut, Plus, Scale, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../state/AuthContext.jsx'

export function DashboardPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  const [exercises, setExercises] = useState([])
  const [weightLogs, setWeightLogs] = useState([])

  const [weightDate, setWeightDate] = useState(todayDate())
  const [weightKg, setWeightKg] = useState('')
  const [weightSaving, setWeightSaving] = useState(false)
  const [weightMessage, setWeightMessage] = useState('')

  const [newExerciseName, setNewExerciseName] = useState('')
  const [exerciseSaving, setExerciseSaving] = useState(false)
  const [exerciseMessage, setExerciseMessage] = useState('')

  const [selectedExerciseId, setSelectedExerciseId] = useState('')
  const [sessionDate, setSessionDate] = useState(todayDate())
  const [sessionNotes, setSessionNotes] = useState('')
  const [sets, setSets] = useState([{ weightKg: '', reps: '' }])
  const [sessionSaving, setSessionSaving] = useState(false)
  const [sessionMessage, setSessionMessage] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadInitialData() {
      if (!user) return

      setPageLoading(true)
      setPageError('')

      const [exerciseResult, weightResult] = await Promise.all([
        supabase.from('exercises').select('id,name,user_id').order('name'),
        supabase
          .from('body_weight_logs')
          .select('id,log_date,weight_kg')
          .eq('user_id', user.id)
          .gte('log_date', thirtyDaysAgoDate())
          .lte('log_date', todayDate())
          .order('log_date', { ascending: true }),
      ])

      if (!mounted) return

      if (exerciseResult.error) {
        setPageError(exerciseResult.error.message)
        setPageLoading(false)
        return
      }

      if (weightResult.error) {
        setPageError(weightResult.error.message)
        setPageLoading(false)
        return
      }

      setExercises(exerciseResult.data ?? [])
      setWeightLogs(weightResult.data ?? [])
      setPageLoading(false)
    }

    loadInitialData()

    return () => {
      mounted = false
    }
  }, [user])

  const exerciseOptions = useMemo(
    () => exercises.map((exercise) => ({ value: String(exercise.id), label: exercise.name })),
    [exercises],
  )

  const recentWeights = useMemo(
    () => [...weightLogs].sort((a, b) => b.log_date.localeCompare(a.log_date)).slice(0, 7),
    [weightLogs],
  )

  const bodyWeightChartData = useMemo(
    () =>
      weightLogs.map((log) => ({
        date: log.log_date,
        label: format(parseISO(log.log_date), 'MMM d'),
        weightKg: Number(log.weight_kg),
      })),
    [weightLogs],
  )

  async function refreshWeightLogs() {
    if (!user) return

    const { data, error } = await supabase
      .from('body_weight_logs')
      .select('id,log_date,weight_kg')
      .eq('user_id', user.id)
      .gte('log_date', thirtyDaysAgoDate())
      .lte('log_date', todayDate())
      .order('log_date', { ascending: true })

    if (!error) {
      setWeightLogs(data ?? [])
    }
  }

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  async function handleWeightSubmit(event) {
    event.preventDefault()
    if (!user) return

    setWeightMessage('')
    setWeightSaving(true)

    const parsedWeight = Number(weightKg)
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setWeightMessage('Weight must be a number greater than 0.')
      setWeightSaving(false)
      return
    }

    const { error } = await supabase.from('body_weight_logs').upsert(
      {
        user_id: user.id,
        log_date: weightDate,
        weight_kg: parsedWeight,
      },
      { onConflict: 'user_id,log_date' },
    )

    if (error) {
      setWeightMessage(error.message)
      setWeightSaving(false)
      return
    }

    await refreshWeightLogs()
    setWeightMessage('Body weight saved.')
    setWeightKg('')
    setWeightSaving(false)
  }

  async function handleAddExercise(event) {
    event.preventDefault()
    if (!user) return

    const trimmedName = newExerciseName.trim()
    if (!trimmedName) {
      setExerciseMessage('Exercise name cannot be empty.')
      return
    }

    setExerciseSaving(true)
    setExerciseMessage('')

    const { data, error } = await supabase
      .from('exercises')
      .insert([{ name: trimmedName, user_id: user.id }])
      .select('id,name,user_id')
      .single()

    if (error) {
      setExerciseMessage(error.message)
      setExerciseSaving(false)
      return
    }

    setExercises((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setSelectedExerciseId(String(data.id))
    setNewExerciseName('')
    setExerciseMessage('Exercise added.')
    setExerciseSaving(false)
  }

  function addSetRow() {
    setSets((prev) => [...prev, { weightKg: '', reps: '' }])
  }

  function removeSetRow(index) {
    setSets((prev) => {
      if (prev.length === 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }

  function updateSetRow(index, key, value) {
    setSets((prev) => prev.map((setRow, i) => (i === index ? { ...setRow, [key]: value } : setRow)))
  }

  async function handleSessionSubmit(event) {
    event.preventDefault()
    if (!user) return

    setSessionMessage('')

    if (!selectedExerciseId) {
      setSessionMessage('Select an exercise first.')
      return
    }

    const normalizedSets = []
    for (const [index, setRow] of sets.entries()) {
      const parsedWeight = Number(setRow.weightKg)
      const parsedReps = Number(setRow.reps)
      if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
        setSessionMessage(`Set ${index + 1}: weight must be greater than 0.`)
        return
      }
      if (!Number.isInteger(parsedReps) || parsedReps <= 0) {
        setSessionMessage(`Set ${index + 1}: reps must be a whole number greater than 0.`)
        return
      }
      normalizedSets.push({ weight_kg: parsedWeight, reps: parsedReps })
    }

    setSessionSaving(true)

    const { data: sessionData, error: sessionError } = await supabase
      .from('workout_sessions')
      .insert([
        {
          user_id: user.id,
          session_date: sessionDate,
          notes: sessionNotes.trim() || null,
        },
      ])
      .select('id')
      .single()

    if (sessionError || !sessionData) {
      setSessionMessage(sessionError?.message ?? 'Failed to create workout session.')
      setSessionSaving(false)
      return
    }

    const setRows = normalizedSets.map((setRow, index) => ({
      session_id: sessionData.id,
      exercise_id: Number(selectedExerciseId),
      set_order: index + 1,
      weight_kg: setRow.weight_kg,
      reps: setRow.reps,
    }))

    const { error: setsError } = await supabase.from('workout_sets').insert(setRows)

    if (setsError) {
      await supabase.from('workout_sessions').delete().eq('id', sessionData.id)
      setSessionMessage(setsError.message)
      setSessionSaving(false)
      return
    }

    setSessionMessage('Workout session logged.')
    setSets([{ weightKg: '', reps: '' }])
    setSessionNotes('')
    setSessionSaving(false)
  }

  if (pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">Loading dashboard...</div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-semibold text-slate-900">GymProgress</h1>
          <div className="flex items-center gap-2">
            <Link
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              to="/progress"
            >
              <ChartSpline className="h-4 w-4" />
              Progress
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

      <main className="mx-auto grid w-full max-w-5xl gap-4 px-4 py-6 md:grid-cols-3">
        {pageError ? (
          <section className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-700 md:col-span-3">
            {pageError}
          </section>
        ) : null}

        <section className="rounded-xl bg-white p-5 shadow-sm md:col-span-3">
          <p className="text-sm text-slate-500">Signed in as</p>
          <p className="mt-1 text-slate-900">{user?.email}</p>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm md:col-span-3">
          <div className="mb-3 flex items-center gap-2 text-slate-800">
            <ChartSpline className="h-4 w-4" />
            <h2 className="font-medium">Body Weight (Last 30 Days)</h2>
          </div>
          {bodyWeightChartData.length === 0 ? (
            <p className="text-sm text-slate-600">No body weight logs in the last 30 days yet.</p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bodyWeightChartData}>
                  <XAxis dataKey="label" minTickGap={24} tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} width={40} />
                  <Tooltip
                    formatter={(value) => [`${value} kg`, 'Weight']}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ''}
                  />
                  <Line
                    type="monotone"
                    dataKey="weightKg"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm md:col-span-1">
          <div className="mb-3 flex items-center gap-2 text-slate-800">
            <Scale className="h-4 w-4" />
            <h2 className="font-medium">Weight Tracker</h2>
          </div>

          <form className="space-y-3" onSubmit={handleWeightSubmit}>
            <label className="block">
              <span className="mb-1 block text-sm text-slate-700">Date</span>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-blue-200 focus:ring"
                type="date"
                value={weightDate}
                onChange={(event) => setWeightDate(event.target.value)}
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm text-slate-700">Weight (kg)</span>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-blue-200 focus:ring"
                type="number"
                min="0"
                step="0.1"
                value={weightKg}
                onChange={(event) => setWeightKg(event.target.value)}
                placeholder="80.5"
                required
              />
            </label>

            <button
              className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
              type="submit"
              disabled={weightSaving}
            >
              {weightSaving ? 'Saving...' : 'Save Weight'}
            </button>
          </form>

          {weightMessage ? <p className="mt-3 text-sm text-slate-700">{weightMessage}</p> : null}

          <div className="mt-4">
            <h3 className="text-sm font-medium text-slate-800">Recent entries</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {recentWeights.length === 0 ? (
                <li>No weight logs yet.</li>
              ) : (
                recentWeights.map((log) => (
                  <li className="flex items-center justify-between" key={log.id}>
                    <span>{log.log_date}</span>
                    <span>{log.weight_kg} kg</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm md:col-span-2">
          <div className="mb-3 flex items-center gap-2 text-slate-800">
            <Activity className="h-4 w-4" />
            <h2 className="font-medium">Exercise Logger</h2>
          </div>

          <form className="mb-5 space-y-3 rounded-lg border border-slate-200 p-3" onSubmit={handleAddExercise}>
            <h3 className="text-sm font-medium text-slate-800">Add custom exercise</h3>
            <div className="flex gap-2">
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-blue-200 focus:ring"
                type="text"
                value={newExerciseName}
                onChange={(event) => setNewExerciseName(event.target.value)}
                placeholder="Incline Dumbbell Press"
              />
              <button
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                type="submit"
                disabled={exerciseSaving}
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
            {exerciseMessage ? <p className="text-sm text-slate-700">{exerciseMessage}</p> : null}
          </form>

          <form className="space-y-3" onSubmit={handleSessionSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm text-slate-700">Exercise</span>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-blue-200 focus:ring"
                  value={selectedExerciseId}
                  onChange={(event) => setSelectedExerciseId(event.target.value)}
                  required
                >
                  <option value="">Select an exercise</option>
                  {exerciseOptions.map((exercise) => (
                    <option key={exercise.value} value={exercise.value}>
                      {exercise.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-slate-700">Session date</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-blue-200 focus:ring"
                  type="date"
                  value={sessionDate}
                  onChange={(event) => setSessionDate(event.target.value)}
                  required
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm text-slate-700">Notes (optional)</span>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-blue-200 focus:ring"
                rows={2}
                value={sessionNotes}
                onChange={(event) => setSessionNotes(event.target.value)}
                placeholder="Felt strong, paused reps on set 3."
              />
            </label>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-800">Sets</h3>
                <button
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  type="button"
                  onClick={addSetRow}
                >
                  <Plus className="h-4 w-4" />
                  Add set
                </button>
              </div>

              {sets.map((setRow, index) => (
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2" key={`set-${index + 1}`}>
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-blue-200 focus:ring"
                    type="number"
                    min="0"
                    step="0.5"
                    value={setRow.weightKg}
                    onChange={(event) => updateSetRow(index, 'weightKg', event.target.value)}
                    placeholder={`Set ${index + 1} weight (kg)`}
                    required
                  />
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-blue-200 focus:ring"
                    type="number"
                    min="1"
                    step="1"
                    value={setRow.reps}
                    onChange={(event) => updateSetRow(index, 'reps', event.target.value)}
                    placeholder="Reps"
                    required
                  />
                  <button
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    type="button"
                    onClick={() => removeSetRow(index)}
                    disabled={sets.length === 1}
                    aria-label={`Remove set ${index + 1}`}
                    title={`Remove set ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
              type="submit"
              disabled={sessionSaving}
            >
              {sessionSaving ? 'Saving workout...' : 'Save Workout Session'}
            </button>
          </form>

          {sessionMessage ? <p className="mt-3 text-sm text-slate-700">{sessionMessage}</p> : null}
        </section>
      </main>
    </div>
  )
}

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

function thirtyDaysAgoDate() {
  return format(subDays(new Date(), 29), 'yyyy-MM-dd')
}
