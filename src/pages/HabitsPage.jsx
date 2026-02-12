import { addDays, format, subDays } from 'date-fns'
import { ArrowLeft, ChartNoAxesCombined, Check, LogOut, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card.jsx'
import { Input } from '../components/ui/input.jsx'
import { Label } from '../components/ui/label.jsx'
import { Textarea } from '../components/ui/textarea.jsx'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../state/AuthContext.jsx'

export function HabitsPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [supported, setSupported] = useState(true)
  const [habits, setHabits] = useState([])
  const [logs, setLogs] = useState([])

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [editingHabitId, setEditingHabitId] = useState('')
  const [editingDescription, setEditingDescription] = useState('')
  const [updatingDescription, setUpdatingDescription] = useState(false)

  const today = todayDate()
  const recentDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'yyyy-MM-dd')),
    [],
  )

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!user) return

      setLoading(true)
      const [habitRes, logRes] = await Promise.all([
        supabase.from('habits').select('id,name,description,is_active').eq('user_id', user.id).order('created_at'),
        supabase
          .from('habit_logs')
          .select('habit_id,log_date,completed')
          .eq('user_id', user.id)
          .gte('log_date', format(subDays(new Date(), 29), 'yyyy-MM-dd'))
          .lte('log_date', format(addDays(new Date(), 1), 'yyyy-MM-dd')),
      ])

      if (!mounted) return

      if (habitRes.error || logRes.error) {
        setSupported(false)
        setError('Habit tables are missing. Run the new habit SQL migration.')
        setLoading(false)
        return
      }

      setSupported(true)
      setHabits(habitRes.data ?? [])
      setLogs(logRes.data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      mounted = false
    }
  }, [user])

  const activeHabits = useMemo(() => habits.filter((h) => h.is_active), [habits])
  const completedMap = useMemo(() => {
    const map = new Map()
    for (const row of logs) {
      map.set(`${row.habit_id}:${row.log_date}`, !!row.completed)
    }
    return map
  }, [logs])

  async function refreshData() {
    if (!user || !supported) return

    const [habitRes, logRes] = await Promise.all([
      supabase.from('habits').select('id,name,description,is_active').eq('user_id', user.id).order('created_at'),
      supabase
        .from('habit_logs')
        .select('habit_id,log_date,completed')
        .eq('user_id', user.id)
        .gte('log_date', format(subDays(new Date(), 29), 'yyyy-MM-dd'))
        .lte('log_date', format(addDays(new Date(), 1), 'yyyy-MM-dd')),
    ])

    if (!habitRes.error) setHabits(habitRes.data ?? [])
    if (!logRes.error) setLogs(logRes.data ?? [])
  }

  function isCompleted(habitId, date) {
    return completedMap.get(`${habitId}:${date}`) ?? false
  }

  async function toggleHabitToday(habit) {
    if (!user) return

    const next = !isCompleted(habit.id, today)
    const { error: upsertError } = await supabase.from('habit_logs').upsert(
      [{ user_id: user.id, habit_id: habit.id, log_date: today, completed: next }],
      { onConflict: 'user_id,habit_id,log_date' },
    )

    if (upsertError) {
      setMessage(upsertError.message)
      return
    }

    await refreshData()
  }

  async function createHabit() {
    if (!user || !supported) return

    const trimmed = name.trim()
    if (!trimmed) {
      setMessage('Habit name is required.')
      return
    }

    setSaving(true)
    setMessage('')

    const { error: createError } = await supabase
      .from('habits')
      .insert([{ user_id: user.id, name: trimmed, description: description.trim() || null }])

    if (createError) {
      setMessage(createError.message)
      setSaving(false)
      return
    }

    setName('')
    setDescription('')
    setSaving(false)
    setMessage('Habit created.')
    await refreshData()
  }

  async function handleCreateHabit(event) {
    event.preventDefault()
    await createHabit()
  }

  async function handleDescriptionKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      await createHabit()
    }
  }

  async function toggleHabitActive(habit) {
    if (!user || !supported) return

    const { error: updateError } = await supabase
      .from('habits')
      .update({ is_active: !habit.is_active })
      .eq('id', habit.id)
      .eq('user_id', user.id)

    if (updateError) {
      setMessage(updateError.message)
      return
    }

    await refreshData()
  }

  async function deleteHabit(habit) {
    if (!user || !supported) return
    if (!window.confirm(`Delete "${habit.name}"?`)) return

    const { error: deleteError } = await supabase.from('habits').delete().eq('id', habit.id).eq('user_id', user.id)

    if (deleteError) {
      setMessage(deleteError.message)
      return
    }

    setMessage('Habit deleted.')
    await refreshData()
  }

  function startEditingDescription(habit) {
    setEditingHabitId(String(habit.id))
    setEditingDescription(habit.description ?? '')
    setMessage('')
  }

  function cancelEditingDescription() {
    setEditingHabitId('')
    setEditingDescription('')
  }

  async function saveHabitDescription(habit) {
    if (!user || !supported) return

    setUpdatingDescription(true)

    const { error: updateError } = await supabase
      .from('habits')
      .update({ description: editingDescription.trim() || null })
      .eq('id', habit.id)
      .eq('user_id', user.id)

    if (updateError) {
      setMessage(updateError.message)
      setUpdatingDescription(false)
      return
    }

    setMessage('Habit description updated.')
    setUpdatingDescription(false)
    cancelEditingDescription()
    await refreshData()
  }

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-600">Loading habits...</div>
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-3 py-3 sm:px-4">
          <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Habit Tracker</h1>
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

      <main className="mx-auto grid w-full max-w-6xl gap-4 px-3 py-4 sm:px-4 sm:py-6">
        {error ? (
          <Card className="border-red-300 bg-red-50">
            <CardContent className="p-4 text-red-700">{error}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Habits</CardTitle>
            <CardDescription>Tick off each daily habit when completed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeHabits.length === 0 ? (
              <p className="text-sm text-slate-600">No active habits yet.</p>
            ) : (
              activeHabits.map((habit) => {
                const done = isCompleted(habit.id, today)
                return (
                  <button
                    key={habit.id}
                    className={`w-full rounded-md border p-3 text-left ${
                      done ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'
                    }`}
                    onClick={() => toggleHabitToday(habit)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">{habit.name}</p>
                        {habit.description ? (
                          <p className="mt-1 text-sm text-slate-600 whitespace-pre-line">{habit.description}</p>
                        ) : null}
                      </div>
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-md border ${
                          done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'
                        }`}
                      >
                        {done ? <Check className="h-4 w-4" /> : null}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ChartNoAxesCombined className="h-4 w-4" />
              <CardTitle>Consistency Table (7 days)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {habits.length === 0 ? (
              <p className="text-sm text-slate-600">No habits yet.</p>
            ) : (
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th className="px-2 py-2">Habit</th>
                    {recentDays.map((day) => (
                      <th key={day} className="px-2 py-2">
                        {format(new Date(`${day}T00:00:00`), 'EEE')}
                      </th>
                    ))}
                    <th className="px-2 py-2">7d Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {habits.map((habit) => {
                    const hits = recentDays.filter((day) => isCompleted(habit.id, day)).length
                    return (
                      <tr key={habit.id} className="border-b border-slate-100">
                        <td className="px-2 py-2 font-medium text-slate-900">{habit.name}</td>
                        {recentDays.map((day) => (
                          <td key={`${habit.id}-${day}`} className="px-2 py-2">
                            {isCompleted(habit.id, day) ? '✓' : '·'}
                          </td>
                        ))}
                        <td className="px-2 py-2">{Math.round((hits / recentDays.length) * 100)}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manage Habits</CardTitle>
            <CardDescription>Create new habits and manage older ones.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-3 rounded-md border border-slate-200 p-3" onSubmit={handleCreateHabit}>
              <div className="space-y-1.5">
                <Label htmlFor="habit-name">Habit name</Label>
                <Input
                  id="habit-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Read 10 pages"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="habit-description">Description</Label>
                <Textarea
                  id="habit-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  onKeyDown={handleDescriptionKeyDown}
                  placeholder="Do this before bed"
                  rows={3}
                />
                <p className="text-xs text-slate-500">Press Enter to create. Shift+Enter for a new line.</p>
              </div>
              <Button type="submit" disabled={saving}>
                <Plus className="h-4 w-4" />
                {saving ? 'Creating...' : 'Create Habit'}
              </Button>
            </form>

            <div className="space-y-2">
              {habits.length === 0 ? (
                <p className="text-sm text-slate-600">No habits to manage yet.</p>
              ) : (
                habits.map((habit) => (
                  <Card key={habit.id} className="bg-slate-50">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-slate-900">{habit.name}</p>
                          {editingHabitId === String(habit.id) ? (
                            <div className="mt-2 space-y-2">
                              <Textarea
                                value={editingDescription}
                                onChange={(event) => setEditingDescription(event.target.value)}
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => saveHabitDescription(habit)}
                                  disabled={updatingDescription}
                                >
                                  <Save className="h-4 w-4" />
                                  {updatingDescription ? 'Saving...' : 'Save'}
                                </Button>
                                <Button type="button" size="sm" variant="outline" onClick={cancelEditingDescription}>
                                  <X className="h-4 w-4" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : habit.description ? (
                            <p className="text-sm text-slate-600 whitespace-pre-line">{habit.description}</p>
                          ) : (
                            <p className="text-sm text-slate-500">No description.</p>
                          )}
                          <p className="mt-1 text-xs text-slate-500">
                            Status: {habit.is_active ? 'Active' : 'Archived'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => startEditingDescription(habit)}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => toggleHabitActive(habit)}>
                            {habit.is_active ? 'Archive' : 'Activate'}
                          </Button>
                          <Button type="button" size="sm" variant="destructive" onClick={() => deleteHabit(habit)}>
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      </main>
    </div>
  )
}

function todayDate() {
  return format(new Date(), 'yyyy-MM-dd')
}
