import { ArrowDown, ArrowUp, ArrowLeft, LogOut, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MobileBottomNav } from '../components/MobileBottomNav.jsx'
import { Button } from '../components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card.jsx'
import { Input } from '../components/ui/input.jsx'
import { Label } from '../components/ui/label.jsx'
import { Textarea } from '../components/ui/textarea.jsx'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../state/AuthContext.jsx'

const splits = ['push', 'pull', 'legs']

export function PlansPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [supported, setSupported] = useState(true)
  const [message, setMessage] = useState('')

  const [selectedSplit, setSelectedSplit] = useState('push')
  const [variants, setVariants] = useState([])
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [exercises, setExercises] = useState([])

  const [newVariantName, setNewVariantName] = useState('')
  const [variantSaving, setVariantSaving] = useState(false)

  const [exerciseName, setExerciseName] = useState('')
  const [exerciseSets, setExerciseSets] = useState('')
  const [exerciseRepRange, setExerciseRepRange] = useState('')
  const [exerciseNotes, setExerciseNotes] = useState('')
  const [exerciseSaving, setExerciseSaving] = useState(false)
  const [editingExerciseId, setEditingExerciseId] = useState('')
  const [editingExerciseName, setEditingExerciseName] = useState('')
  const [editingExerciseSets, setEditingExerciseSets] = useState('')
  const [editingExerciseRepRange, setEditingExerciseRepRange] = useState('')
  const [editingExerciseNotes, setEditingExerciseNotes] = useState('')
  const [exerciseUpdating, setExerciseUpdating] = useState(false)

  const splitVariants = useMemo(
    () => variants.filter((variant) => variant.split_type === selectedSplit),
    [selectedSplit, variants],
  )

  const selectedVariant = useMemo(
    () => splitVariants.find((variant) => String(variant.id) === selectedVariantId),
    [selectedVariantId, splitVariants],
  )

  useEffect(() => {
    let mounted = true
    async function loadData() {
      if (!user) return

      setLoading(true)
      setError('')

      const { data: variantData, error: variantError } = await supabase
        .from('workout_plan_variants')
        .select('id,split_type,name')
        .eq('user_id', user.id)
        .order('created_at')

      if (!mounted) return

      if (variantError) {
        setSupported(false)
        setError('Workout plan tables are missing. Run the workout plans SQL migration.')
        setLoading(false)
        return
      }

      setSupported(true)
      const variantRows = variantData ?? []
      setVariants(variantRows)
      setLoading(false)
    }

    loadData()
    return () => {
      mounted = false
    }
  }, [user])

  useEffect(() => {
    if (splitVariants.length === 0) {
      setSelectedVariantId('')
      setExercises([])
      return
    }
    if (!selectedVariantId || !splitVariants.some((variant) => String(variant.id) === selectedVariantId)) {
      setSelectedVariantId(String(splitVariants[0].id))
    }
  }, [selectedVariantId, splitVariants])

  useEffect(() => {
    async function loadExercises() {
      if (!selectedVariantId || !supported) {
        setExercises([])
        return
      }

      const { data, error: exerciseError } = await supabase
        .from('workout_plan_exercises')
        .select('id,position,exercise_name,sets,rep_range,notes')
        .eq('variant_id', Number(selectedVariantId))
        .order('position')

      if (exerciseError) {
        setMessage(exerciseError.message)
        return
      }

      setExercises(data ?? [])
    }

    loadExercises()
  }, [selectedVariantId, supported])

  async function refreshVariants() {
    if (!user || !supported) return
    const { data, error: variantError } = await supabase
      .from('workout_plan_variants')
      .select('id,split_type,name')
      .eq('user_id', user.id)
      .order('created_at')
    if (variantError) return
    setVariants(data ?? [])
  }

  async function refreshExercises() {
    if (!selectedVariantId || !supported) return
    const { data, error: exerciseError } = await supabase
      .from('workout_plan_exercises')
      .select('id,position,exercise_name,sets,rep_range,notes')
      .eq('variant_id', Number(selectedVariantId))
      .order('position')
    if (exerciseError) return
    setExercises(data ?? [])
  }

  async function handleCreateVariant(event) {
    event.preventDefault()
    if (!user || !supported) return

    const trimmed = newVariantName.trim()
    if (!trimmed) {
      setMessage('Variant name is required.')
      return
    }

    setVariantSaving(true)
    setMessage('')

    const { data, error: variantError } = await supabase
      .from('workout_plan_variants')
      .insert([{ user_id: user.id, split_type: selectedSplit, name: trimmed }])
      .select('id')
      .single()

    if (variantError) {
      setMessage(variantError.message)
      setVariantSaving(false)
      return
    }

    setNewVariantName('')
    setVariantSaving(false)
    await refreshVariants()
    if (data?.id) setSelectedVariantId(String(data.id))
  }

  async function handleDeleteVariant() {
    if (!selectedVariantId || !user || !supported) return
    if (!window.confirm('Delete this variant and all of its exercises?')) return

    const { error: variantError } = await supabase
      .from('workout_plan_variants')
      .delete()
      .eq('id', Number(selectedVariantId))
      .eq('user_id', user.id)

    if (variantError) {
      setMessage(variantError.message)
      return
    }

    setMessage('Variant deleted.')
    setSelectedVariantId('')
    await refreshVariants()
    setExercises([])
  }

  async function handleAddExercise(event) {
    event.preventDefault()
    if (!selectedVariantId || !supported) return

    const trimmed = exerciseName.trim()
    if (!trimmed) {
      setMessage('Exercise name is required.')
      return
    }

    setExerciseSaving(true)
    setMessage('')

    const nextPosition = exercises.length + 1
    const payload = {
      variant_id: Number(selectedVariantId),
      position: nextPosition,
      exercise_name: trimmed,
      sets: exerciseSets ? Number(exerciseSets) : null,
      rep_range: exerciseRepRange.trim() || null,
      notes: exerciseNotes.trim() || null,
    }

    const { error: exerciseError } = await supabase.from('workout_plan_exercises').insert([payload])
    if (exerciseError) {
      setMessage(exerciseError.message)
      setExerciseSaving(false)
      return
    }

    setExerciseName('')
    setExerciseSets('')
    setExerciseRepRange('')
    setExerciseNotes('')
    setExerciseSaving(false)
    await refreshExercises()
  }

  async function moveExercise(exerciseId, direction) {
    const index = exercises.findIndex((exercise) => exercise.id === exerciseId)
    if (index < 0) return

    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= exercises.length) return

    const current = exercises[index]
    const other = exercises[swapIndex]

    const { error: errA } = await supabase
      .from('workout_plan_exercises')
      .update({ position: -1 })
      .eq('id', current.id)
      .eq('variant_id', Number(selectedVariantId))
    if (errA) {
      setMessage(errA.message)
      return
    }

    const { error: errB } = await supabase
      .from('workout_plan_exercises')
      .update({ position: current.position })
      .eq('id', other.id)
      .eq('variant_id', Number(selectedVariantId))
    if (errB) {
      setMessage(errB.message)
      return
    }

    const { error: errC } = await supabase
      .from('workout_plan_exercises')
      .update({ position: other.position })
      .eq('id', current.id)
      .eq('variant_id', Number(selectedVariantId))
    if (errC) {
      setMessage(errC.message)
      return
    }

    await refreshExercises()
  }

  async function deleteExercise(exerciseId) {
    if (!selectedVariantId || !supported) return

    const { error: deleteError } = await supabase
      .from('workout_plan_exercises')
      .delete()
      .eq('id', exerciseId)
      .eq('variant_id', Number(selectedVariantId))
    if (deleteError) {
      setMessage(deleteError.message)
      return
    }

    const remaining = exercises.filter((exercise) => exercise.id !== exerciseId)
    for (const [idx, item] of remaining.entries()) {
      await supabase
        .from('workout_plan_exercises')
        .update({ position: idx + 1 })
        .eq('id', item.id)
        .eq('variant_id', Number(selectedVariantId))
    }
    await refreshExercises()
  }

  function startEditingExercise(exercise) {
    setEditingExerciseId(String(exercise.id))
    setEditingExerciseName(exercise.exercise_name ?? '')
    setEditingExerciseSets(exercise.sets?.toString() ?? '')
    setEditingExerciseRepRange(exercise.rep_range ?? '')
    setEditingExerciseNotes(exercise.notes ?? '')
    setMessage('')
  }

  function cancelEditingExercise() {
    setEditingExerciseId('')
    setEditingExerciseName('')
    setEditingExerciseSets('')
    setEditingExerciseRepRange('')
    setEditingExerciseNotes('')
  }

  async function saveExerciseEdit(exerciseId) {
    if (!selectedVariantId || !supported) return

    const trimmedName = editingExerciseName.trim()
    if (!trimmedName) {
      setMessage('Exercise name is required.')
      return
    }

    setExerciseUpdating(true)
    const payload = {
      exercise_name: trimmedName,
      sets: editingExerciseSets ? Number(editingExerciseSets) : null,
      rep_range: editingExerciseRepRange.trim() || null,
      notes: editingExerciseNotes.trim() || null,
    }

    const { error: updateError } = await supabase
      .from('workout_plan_exercises')
      .update(payload)
      .eq('id', exerciseId)
      .eq('variant_id', Number(selectedVariantId))

    if (updateError) {
      setMessage(updateError.message)
      setExerciseUpdating(false)
      return
    }

    setExerciseUpdating(false)
    cancelEditingExercise()
    setMessage('Exercise updated.')
    await refreshExercises()
  }

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-600">Loading plans...</div>
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-3 py-3 sm:px-4">
          <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Workout Plans</h1>
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

      <main className="mx-auto grid w-full max-w-6xl gap-4 px-3 py-4 pb-24 sm:px-4 sm:py-6 md:pb-6">
        {error ? (
          <Card className="border-red-300 bg-red-50">
            <CardContent className="p-4 text-red-700">{error}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Split</CardTitle>
            <CardDescription>Manage variants and exercise order by split.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {splits.map((split) => (
              <Button
                key={split}
                type="button"
                variant={selectedSplit === split ? 'default' : 'outline'}
                onClick={() => setSelectedSplit(split)}
              >
                {split[0].toUpperCase() + split.slice(1)}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Variants ({selectedSplit})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form className="flex gap-2" onSubmit={handleCreateVariant}>
              <Input
                value={newVariantName}
                onChange={(event) => setNewVariantName(event.target.value)}
                placeholder={`e.g. ${selectedSplit} - A`}
              />
              <Button type="submit" disabled={variantSaving}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </form>

            {splitVariants.length === 0 ? (
              <p className="text-sm text-slate-600">No variants for this split yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {splitVariants.map((variant) => (
                  <Button
                    key={variant.id}
                    type="button"
                    variant={selectedVariantId === String(variant.id) ? 'default' : 'outline'}
                    onClick={() => setSelectedVariantId(String(variant.id))}
                    className="justify-start"
                  >
                    {variant.name}
                  </Button>
                ))}
              </div>
            )}

            {selectedVariant ? (
              <Button type="button" variant="destructive" onClick={handleDeleteVariant}>
                <Trash2 className="h-4 w-4" />
                Delete selected variant
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exercises {selectedVariant ? `- ${selectedVariant.name}` : ''}</CardTitle>
            <CardDescription>Order is important. Move exercises up/down to arrange sequence.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedVariant ? (
              <p className="text-sm text-slate-600">Select or create a variant first.</p>
            ) : (
              <>
                <form className="space-y-3 rounded-md border border-slate-200 p-3" onSubmit={handleAddExercise}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="plan-ex-name">Exercise name</Label>
                      <Input
                        id="plan-ex-name"
                        value={exerciseName}
                        onChange={(event) => setExerciseName(event.target.value)}
                        placeholder="Barbell Bench Press"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="plan-ex-sets">Sets</Label>
                      <Input
                        id="plan-ex-sets"
                        type="number"
                        min="1"
                        step="1"
                        value={exerciseSets}
                        onChange={(event) => setExerciseSets(event.target.value)}
                        placeholder="4"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="plan-ex-reps">Rep range</Label>
                      <Input
                        id="plan-ex-reps"
                        value={exerciseRepRange}
                        onChange={(event) => setExerciseRepRange(event.target.value)}
                        placeholder="6-8"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="plan-ex-notes">Notes</Label>
                      <Textarea
                        id="plan-ex-notes"
                        value={exerciseNotes}
                        onChange={(event) => setExerciseNotes(event.target.value)}
                        rows={2}
                        placeholder="Pause on chest"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={exerciseSaving}>
                    <Plus className="h-4 w-4" />
                    {exerciseSaving ? 'Adding...' : 'Add Exercise'}
                  </Button>
                </form>

                {exercises.length === 0 ? (
                  <p className="text-sm text-slate-600">No exercises yet for this variant.</p>
                ) : (
                  exercises.map((exercise, idx) => (
                    <Card key={exercise.id} className="bg-slate-50">
                      <CardContent className="p-3">
                        {editingExerciseId === String(exercise.id) ? (
                          <div className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-1.5">
                                <Label>Exercise name</Label>
                                <Input
                                  value={editingExerciseName}
                                  onChange={(event) => setEditingExerciseName(event.target.value)}
                                  placeholder="Barbell Bench Press"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label>Sets</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={editingExerciseSets}
                                  onChange={(event) => setEditingExerciseSets(event.target.value)}
                                  placeholder="4"
                                />
                              </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-1.5">
                                <Label>Rep range</Label>
                                <Input
                                  value={editingExerciseRepRange}
                                  onChange={(event) => setEditingExerciseRepRange(event.target.value)}
                                  placeholder="6-8"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label>Notes</Label>
                                <Textarea
                                  value={editingExerciseNotes}
                                  onChange={(event) => setEditingExerciseNotes(event.target.value)}
                                  rows={2}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                onClick={() => saveExerciseEdit(exercise.id)}
                                disabled={exerciseUpdating}
                              >
                                <Save className="h-4 w-4" />
                                {exerciseUpdating ? 'Saving...' : 'Save'}
                              </Button>
                              <Button type="button" variant="outline" onClick={cancelEditingExercise}>
                                <X className="h-4 w-4" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-slate-900">
                                {exercise.position}. {exercise.exercise_name}
                              </p>
                              <p className="text-sm text-slate-600">
                                Sets: {exercise.sets ?? '-'} | Reps: {exercise.rep_range ?? '-'}
                              </p>
                              {exercise.notes ? <p className="text-sm text-slate-600">{exercise.notes}</p> : null}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                onClick={() => moveExercise(exercise.id, 'up')}
                                disabled={idx === 0}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                onClick={() => moveExercise(exercise.id, 'down')}
                                disabled={idx === exercises.length - 1}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                              <Button type="button" size="icon" variant="outline" onClick={() => startEditingExercise(exercise)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button type="button" size="icon" variant="destructive" onClick={() => deleteExercise(exercise.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </>
            )}
          </CardContent>
        </Card>

        {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      </main>
      <MobileBottomNav />
    </div>
  )
}
