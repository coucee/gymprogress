import { addDays, format, parseISO, subDays } from 'date-fns'
import {
  Activity,
  ChartSpline,
  ListChecks,
  LogOut,
  Minus,
  Pencil,
  Plus,
  Save,
  Scale,
  Trash2,
  Utensils,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '../components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card.jsx'
import { Input } from '../components/ui/input.jsx'
import { Label } from '../components/ui/label.jsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select.jsx'
import { Textarea } from '../components/ui/textarea.jsx'
import { MobileBottomNav } from '../components/MobileBottomNav.jsx'
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

  const [nutritionSupported, setNutritionSupported] = useState(true)
  const [nutritionMessage, setNutritionMessage] = useState('')
  const [recipes, setRecipes] = useState([])
  const [recipeName, setRecipeName] = useState('')
  const [recipeProtein, setRecipeProtein] = useState('')
  const [recipeCarbs, setRecipeCarbs] = useState('')
  const [recipeFat, setRecipeFat] = useState('')
  const [recipeCalories, setRecipeCalories] = useState('')
  const [recipeIngredients, setRecipeIngredients] = useState('')
  const [recipeSaving, setRecipeSaving] = useState(false)
  const [recipeMessage, setRecipeMessage] = useState('')
  const [editingRecipeId, setEditingRecipeId] = useState('')
  const [editRecipeName, setEditRecipeName] = useState('')
  const [editRecipeProtein, setEditRecipeProtein] = useState('')
  const [editRecipeCarbs, setEditRecipeCarbs] = useState('')
  const [editRecipeFat, setEditRecipeFat] = useState('')
  const [editRecipeCalories, setEditRecipeCalories] = useState('')
  const [editRecipeIngredients, setEditRecipeIngredients] = useState('')
  const [recipeUpdating, setRecipeUpdating] = useState(false)
  const [recipeDeletingId, setRecipeDeletingId] = useState('')
  const [todayRecipeId, setTodayRecipeId] = useState('')
  const [tomorrowRecipeId, setTomorrowRecipeId] = useState('')
  const [mealPlanSaving, setMealPlanSaving] = useState(false)
  const [mealPlanMessage, setMealPlanMessage] = useState('')

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

  useEffect(() => {
    let mounted = true

    async function loadNutritionData() {
      if (!user) return

      const [recipeResult, mealPlanResult] = await Promise.all([
        supabase
          .from('recipes')
          .select('id,name,protein_g,carbs_g,fat_g,calories,ingredients')
          .eq('user_id', user.id)
          .order('name'),
        supabase
          .from('meal_plans')
          .select('id,plan_date,recipe_id')
          .eq('user_id', user.id)
          .in('plan_date', [todayDate(), tomorrowDate()]),
      ])

      if (!mounted) return

      if (recipeResult.error || mealPlanResult.error) {
        setNutritionSupported(false)
        setNutritionMessage(
          'Recipe planner tables are missing. Run the Phase 4 SQL migration shown below in the final notes.',
        )
        return
      }

      setNutritionSupported(true)
      setNutritionMessage('')

      const recipeRows = recipeResult.data ?? []
      const mealPlanRows = mealPlanResult.data ?? []
      setRecipes(recipeRows)
      setTodayRecipeId(mealPlanRows.find((row) => row.plan_date === todayDate())?.recipe_id?.toString() ?? '')
      setTomorrowRecipeId(
        mealPlanRows.find((row) => row.plan_date === tomorrowDate())?.recipe_id?.toString() ?? '',
      )
    }

    loadNutritionData()

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

  const recipeMap = useMemo(() => new Map(recipes.map((recipe) => [String(recipe.id), recipe])), [recipes])
  const todayRecipe = recipeMap.get(todayRecipeId)
  const tomorrowRecipe = recipeMap.get(tomorrowRecipeId)

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

  async function refreshNutritionData() {
    if (!user || !nutritionSupported) return

    const [recipeResult, mealPlanResult] = await Promise.all([
      supabase
        .from('recipes')
        .select('id,name,protein_g,carbs_g,fat_g,calories,ingredients')
        .eq('user_id', user.id)
        .order('name'),
      supabase
        .from('meal_plans')
        .select('id,plan_date,recipe_id')
        .eq('user_id', user.id)
        .in('plan_date', [todayDate(), tomorrowDate()]),
    ])

    if (recipeResult.error || mealPlanResult.error) return

    const recipeRows = recipeResult.data ?? []
    const mealPlanRows = mealPlanResult.data ?? []
    setRecipes(recipeRows)
    setTodayRecipeId(mealPlanRows.find((row) => row.plan_date === todayDate())?.recipe_id?.toString() ?? '')
    setTomorrowRecipeId(mealPlanRows.find((row) => row.plan_date === tomorrowDate())?.recipe_id?.toString() ?? '')
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

  function bumpSetValue(index, key, delta) {
    setSets((prev) =>
      prev.map((setRow, i) => {
        if (i !== index) return setRow
        const current = Number(setRow[key]) || 0
        const nextValue = Math.max(0, current + delta)
        return {
          ...setRow,
          [key]: key === 'reps' ? String(Math.round(nextValue)) : String(round1(nextValue)),
        }
      }),
    )
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

  async function handleAddRecipe(event) {
    event.preventDefault()
    if (!user || !nutritionSupported) return

    const trimmedName = recipeName.trim()
    if (!trimmedName) {
      setRecipeMessage('Recipe name is required.')
      return
    }

    setRecipeSaving(true)
    setRecipeMessage('')

    const payload = {
      user_id: user.id,
      name: trimmedName,
      protein_g: recipeProtein ? Number(recipeProtein) : null,
      carbs_g: recipeCarbs ? Number(recipeCarbs) : null,
      fat_g: recipeFat ? Number(recipeFat) : null,
      calories: recipeCalories ? Number(recipeCalories) : null,
      ingredients: recipeIngredients.trim() || null,
    }

    const { error } = await supabase.from('recipes').insert([payload])
    if (error) {
      setRecipeMessage(error.message)
      setRecipeSaving(false)
      return
    }

    setRecipeName('')
    setRecipeProtein('')
    setRecipeCarbs('')
    setRecipeFat('')
    setRecipeCalories('')
    setRecipeIngredients('')
    setRecipeMessage('Recipe saved.')
    setRecipeSaving(false)
    await refreshNutritionData()
  }

  function startEditingRecipe(recipe) {
    setEditingRecipeId(String(recipe.id))
    setEditRecipeName(recipe.name ?? '')
    setEditRecipeProtein(recipe.protein_g?.toString() ?? '')
    setEditRecipeCarbs(recipe.carbs_g?.toString() ?? '')
    setEditRecipeFat(recipe.fat_g?.toString() ?? '')
    setEditRecipeCalories(recipe.calories?.toString() ?? '')
    setEditRecipeIngredients(recipe.ingredients ?? '')
    setRecipeMessage('')
  }

  function cancelEditingRecipe() {
    setEditingRecipeId('')
    setEditRecipeName('')
    setEditRecipeProtein('')
    setEditRecipeCarbs('')
    setEditRecipeFat('')
    setEditRecipeCalories('')
    setEditRecipeIngredients('')
  }

  async function handleUpdateRecipe(recipeId) {
    if (!user || !nutritionSupported) return

    const trimmedName = editRecipeName.trim()
    if (!trimmedName) {
      setRecipeMessage('Recipe name is required.')
      return
    }

    setRecipeUpdating(true)
    setRecipeMessage('')

    const payload = {
      name: trimmedName,
      protein_g: editRecipeProtein ? Number(editRecipeProtein) : null,
      carbs_g: editRecipeCarbs ? Number(editRecipeCarbs) : null,
      fat_g: editRecipeFat ? Number(editRecipeFat) : null,
      calories: editRecipeCalories ? Number(editRecipeCalories) : null,
      ingredients: editRecipeIngredients.trim() || null,
    }

    const { error } = await supabase.from('recipes').update(payload).eq('id', recipeId).eq('user_id', user.id)
    if (error) {
      setRecipeMessage(error.message)
      setRecipeUpdating(false)
      return
    }

    setRecipeMessage('Recipe updated.')
    setRecipeUpdating(false)
    cancelEditingRecipe()
    await refreshNutritionData()
  }

  async function handleDeleteRecipe(recipe) {
    if (!user || !nutritionSupported) return

    const confirmed = window.confirm(`Delete "${recipe.name}"?`)
    if (!confirmed) return

    setRecipeDeletingId(String(recipe.id))
    setRecipeMessage('')

    const { error } = await supabase.from('recipes').delete().eq('id', recipe.id).eq('user_id', user.id)
    if (error) {
      setRecipeMessage(error.message)
      setRecipeDeletingId('')
      return
    }

    if (todayRecipeId === String(recipe.id)) setTodayRecipeId('')
    if (tomorrowRecipeId === String(recipe.id)) setTomorrowRecipeId('')
    if (editingRecipeId === String(recipe.id)) cancelEditingRecipe()

    setRecipeDeletingId('')
    setRecipeMessage('Recipe deleted.')
    await refreshNutritionData()
  }

  async function handleSaveMealPlan(event) {
    event.preventDefault()
    if (!user || !nutritionSupported) return

    setMealPlanSaving(true)
    setMealPlanMessage('')

    const upserts = []
    if (todayRecipeId) {
      upserts.push({ user_id: user.id, plan_date: todayDate(), recipe_id: Number(todayRecipeId) })
    }
    if (tomorrowRecipeId) {
      upserts.push({ user_id: user.id, plan_date: tomorrowDate(), recipe_id: Number(tomorrowRecipeId) })
    }

    if (upserts.length > 0) {
      const { error } = await supabase.from('meal_plans').upsert(upserts, {
        onConflict: 'user_id,plan_date',
      })
      if (error) {
        setMealPlanMessage(error.message)
        setMealPlanSaving(false)
        return
      }
    }

    setMealPlanMessage('Meal plan saved.')
    setMealPlanSaving(false)
    await refreshNutritionData()
  }

  if (pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">Loading dashboard...</div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-3 py-3 sm:px-4">
          <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">GymProgress</h1>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
              <Link to="/progress">
                <ChartSpline className="h-4 w-4" />
                Progress
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
              <Link to="/habits">
                <ListChecks className="h-4 w-4" />
                Habits
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
              <Link to="/plans">Plans</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} type="button">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-4 px-3 py-4 pb-24 sm:px-4 sm:py-6 md:grid-cols-3 md:pb-6">
        {pageError ? (
          <Card className="border-red-300 bg-red-50 md:col-span-3">
            <CardContent className="p-4 text-red-700">{pageError}</CardContent>
          </Card>
        ) : null}

        <Card className="md:col-span-3">
          <CardHeader>
            <CardDescription>Signed in as</CardDescription>
            <CardTitle className="text-base font-medium">{user?.email}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <div className="flex items-center gap-2 text-slate-800">
              <ChartSpline className="h-4 w-4" />
              <CardTitle>Body Weight (Last 30 Days)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2 text-slate-800">
              <Scale className="h-4 w-4" />
              <CardTitle>Weight Tracker</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-3" onSubmit={handleWeightSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="weight-date">Date</Label>
                <Input
                  id="weight-date"
                  type="date"
                  value={weightDate}
                  onChange={(event) => setWeightDate(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weight-kg">Weight (kg)</Label>
                <Input
                  id="weight-kg"
                  type="number"
                  min="0"
                  step="0.1"
                  value={weightKg}
                  onChange={(event) => setWeightKg(event.target.value)}
                  placeholder="80.5"
                  required
                />
              </div>
              <Button className="w-full" type="submit" disabled={weightSaving}>
                {weightSaving ? 'Saving...' : 'Save Weight'}
              </Button>
            </form>

            {weightMessage ? <p className="text-sm text-slate-700">{weightMessage}</p> : null}

            <div>
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
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2 text-slate-800">
              <Activity className="h-4 w-4" />
              <CardTitle>Exercise Logger</CardTitle>
            </div>
            <CardDescription>Mobile-first set entry with quick +/- controls.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form className="space-y-3 rounded-md border border-slate-200 p-3" onSubmit={handleAddExercise}>
              <h3 className="text-sm font-medium text-slate-800">Add custom exercise</h3>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newExerciseName}
                  onChange={(event) => setNewExerciseName(event.target.value)}
                  placeholder="Incline Dumbbell Press"
                />
                <Button type="submit" variant="outline" disabled={exerciseSaving}>
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
              {exerciseMessage ? <p className="text-sm text-slate-700">{exerciseMessage}</p> : null}
            </form>

            <form className="space-y-3" onSubmit={handleSessionSubmit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Exercise</Label>
                  <Select value={selectedExerciseId} onValueChange={setSelectedExerciseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an exercise" />
                    </SelectTrigger>
                    <SelectContent>
                      {exerciseOptions.map((exercise) => (
                        <SelectItem key={exercise.value} value={exercise.value}>
                          {exercise.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="session-date">Session date</Label>
                  <Input
                    id="session-date"
                    type="date"
                    value={sessionDate}
                    onChange={(event) => setSessionDate(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="session-notes">Notes (optional)</Label>
                <Textarea
                  id="session-notes"
                  rows={2}
                  value={sessionNotes}
                  onChange={(event) => setSessionNotes(event.target.value)}
                  placeholder="Felt strong, paused reps on set 3."
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-800">Sets</h3>
                  <Button type="button" variant="outline" onClick={addSetRow}>
                    <Plus className="h-4 w-4" />
                    Add set
                  </Button>
                </div>

                {sets.map((setRow, index) => (
                  <Card key={`set-${index + 1}`} className="bg-slate-50">
                    <CardContent className="p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-800">Set {index + 1}</p>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeSetRow(index)}
                          disabled={sets.length === 1}
                          aria-label={`Remove set ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <Label>Weight (kg)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            inputMode="decimal"
                            value={setRow.weightKg}
                            onChange={(event) => updateSetRow(index, 'weightKg', event.target.value)}
                            placeholder="80"
                            className="h-11 text-base"
                            required
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => bumpSetValue(index, 'weightKg', -2.5)}
                            >
                              <Minus className="h-4 w-4" /> 2.5
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => bumpSetValue(index, 'weightKg', 2.5)}
                            >
                              <Plus className="h-4 w-4" /> 2.5
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label>Reps</Label>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            value={setRow.reps}
                            onChange={(event) => updateSetRow(index, 'reps', event.target.value)}
                            placeholder="8"
                            className="h-11 text-base"
                            required
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Button type="button" variant="outline" onClick={() => bumpSetValue(index, 'reps', -1)}>
                              <Minus className="h-4 w-4" /> 1
                            </Button>
                            <Button type="button" variant="outline" onClick={() => bumpSetValue(index, 'reps', 1)}>
                              <Plus className="h-4 w-4" /> 1
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button className="w-full h-11 text-base" type="submit" disabled={sessionSaving}>
                {sessionSaving ? 'Saving workout...' : 'Save Workout Session'}
              </Button>
            </form>

            {sessionMessage ? <p className="text-sm text-slate-700">{sessionMessage}</p> : null}
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <div className="flex items-center gap-2 text-slate-800">
              <Utensils className="h-4 w-4" />
              <CardTitle>Recipes & Next-Day Meal Plan</CardTitle>
            </div>
            <CardDescription>
              Breakfast is fixed, so this planner tracks one main meal for today and one for tomorrow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!nutritionSupported ? (
              <p className="text-sm text-amber-700">{nutritionMessage}</p>
            ) : (
              <>
                <form className="space-y-3 rounded-md border border-slate-200 p-3" onSubmit={handleAddRecipe}>
                  <h3 className="text-sm font-medium text-slate-800">Add recipe</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="recipe-name">Recipe name</Label>
                      <Input
                        id="recipe-name"
                        value={recipeName}
                        onChange={(event) => setRecipeName(event.target.value)}
                        placeholder="Chicken burrito bowl"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="recipe-calories">Calories</Label>
                      <Input
                        id="recipe-calories"
                        type="number"
                        min="0"
                        step="1"
                        value={recipeCalories}
                        onChange={(event) => setRecipeCalories(event.target.value)}
                        placeholder="650"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="recipe-protein">Protein (g)</Label>
                      <Input
                        id="recipe-protein"
                        type="number"
                        min="0"
                        step="1"
                        value={recipeProtein}
                        onChange={(event) => setRecipeProtein(event.target.value)}
                        placeholder="45"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="recipe-carbs">Carbs (g)</Label>
                      <Input
                        id="recipe-carbs"
                        type="number"
                        min="0"
                        step="1"
                        value={recipeCarbs}
                        onChange={(event) => setRecipeCarbs(event.target.value)}
                        placeholder="55"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="recipe-fat">Fat (g)</Label>
                      <Input
                        id="recipe-fat"
                        type="number"
                        min="0"
                        step="1"
                        value={recipeFat}
                        onChange={(event) => setRecipeFat(event.target.value)}
                        placeholder="20"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="recipe-ingredients">Ingredients</Label>
                    <Textarea
                      id="recipe-ingredients"
                      value={recipeIngredients}
                      onChange={(event) => setRecipeIngredients(event.target.value)}
                      placeholder="Chicken breast, rice, black beans, pico de gallo"
                    />
                  </div>
                  <Button type="submit" disabled={recipeSaving}>
                    {recipeSaving ? 'Saving recipe...' : 'Save Recipe'}
                  </Button>
                  {recipeMessage ? <p className="text-sm text-slate-700">{recipeMessage}</p> : null}
                </form>

                <div className="space-y-2 rounded-md border border-slate-200 p-3">
                  <h3 className="text-sm font-medium text-slate-800">Recipe list</h3>
                  {recipes.length === 0 ? (
                    <p className="text-sm text-slate-600">No recipes yet.</p>
                  ) : (
                    recipes.map((recipe) => {
                      const isEditing = editingRecipeId === String(recipe.id)
                      const isDeleting = recipeDeletingId === String(recipe.id)

                      return (
                        <Card key={recipe.id} className="bg-slate-50">
                          <CardContent className="space-y-2 p-3">
                            {isEditing ? (
                              <>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div className="space-y-1.5">
                                    <Label>Recipe name</Label>
                                    <Input
                                      value={editRecipeName}
                                      onChange={(event) => setEditRecipeName(event.target.value)}
                                      placeholder="Recipe name"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label>Calories</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={editRecipeCalories}
                                      onChange={(event) => setEditRecipeCalories(event.target.value)}
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="space-y-1.5">
                                    <Label>Protein</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={editRecipeProtein}
                                      onChange={(event) => setEditRecipeProtein(event.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label>Carbs</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={editRecipeCarbs}
                                      onChange={(event) => setEditRecipeCarbs(event.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label>Fat</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={editRecipeFat}
                                      onChange={(event) => setEditRecipeFat(event.target.value)}
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <Label>Ingredients</Label>
                                  <Textarea
                                    value={editRecipeIngredients}
                                    onChange={(event) => setEditRecipeIngredients(event.target.value)}
                                    placeholder="Ingredients"
                                  />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    onClick={() => handleUpdateRecipe(recipe.id)}
                                    disabled={recipeUpdating}
                                  >
                                    <Save className="h-4 w-4" />
                                    {recipeUpdating ? 'Saving...' : 'Save'}
                                  </Button>
                                  <Button type="button" variant="outline" onClick={cancelEditingRecipe}>
                                    <X className="h-4 w-4" />
                                    Cancel
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="font-medium text-slate-900">{recipe.name}</p>
                                    <p className="text-sm text-slate-600">
                                      {recipe.calories ?? '-'} kcal | P {recipe.protein_g ?? '-'} | C {recipe.carbs_g ?? '-'} | F{' '}
                                      {recipe.fat_g ?? '-'}
                                    </p>
                                    {recipe.ingredients ? (
                                      <p className="mt-1 text-sm text-slate-600">{recipe.ingredients}</p>
                                    ) : null}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button type="button" size="sm" variant="outline" onClick={() => startEditingRecipe(recipe)}>
                                      <Pencil className="h-4 w-4" />
                                      Edit
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleDeleteRecipe(recipe)}
                                      disabled={isDeleting}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      {isDeleting ? 'Deleting...' : 'Delete'}
                                    </Button>
                                  </div>
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </div>

                <form className="space-y-3 rounded-md border border-slate-200 p-3" onSubmit={handleSaveMealPlan}>
                  <h3 className="text-sm font-medium text-slate-800">Plan meals (2 dropdowns)</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Meal for today ({todayDate()})</Label>
                      <Select value={todayRecipeId} onValueChange={setTodayRecipeId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select today's meal" />
                        </SelectTrigger>
                        <SelectContent>
                          {recipes.map((recipe) => (
                            <SelectItem key={recipe.id} value={String(recipe.id)}>
                              {recipe.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Meal for tomorrow ({tomorrowDate()})</Label>
                      <Select value={tomorrowRecipeId} onValueChange={setTomorrowRecipeId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tomorrow's meal" />
                        </SelectTrigger>
                        <SelectContent>
                          {recipes.map((recipe) => (
                            <SelectItem key={recipe.id} value={String(recipe.id)}>
                              {recipe.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" disabled={mealPlanSaving}>
                    {mealPlanSaving ? 'Saving plan...' : 'Save Meal Plan'}
                  </Button>
                  {mealPlanMessage ? <p className="text-sm text-slate-700">{mealPlanMessage}</p> : null}
                </form>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Card className="bg-slate-50">
                    <CardHeader>
                      <CardTitle className="text-sm">Today</CardTitle>
                      <CardDescription>{todayDate()}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      {todayRecipe ? <MealSummary recipe={todayRecipe} /> : <p>No meal selected yet.</p>}
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-50">
                    <CardHeader>
                      <CardTitle className="text-sm">Tomorrow</CardTitle>
                      <CardDescription>{tomorrowDate()}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      {tomorrowRecipe ? <MealSummary recipe={tomorrowRecipe} /> : <p>No meal selected yet.</p>}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
      <MobileBottomNav />
    </div>
  )
}

function MealSummary({ recipe }) {
  return (
    <>
      <p className="font-medium text-slate-900">{recipe.name}</p>
      <p className="text-slate-600">
        {recipe.calories ?? '-'} kcal | P {recipe.protein_g ?? '-'} | C {recipe.carbs_g ?? '-'} | F{' '}
        {recipe.fat_g ?? '-'}
      </p>
      {recipe.ingredients ? <p className="text-slate-600">{recipe.ingredients}</p> : null}
    </>
  )
}

function round1(value) {
  return Math.round(value * 10) / 10
}

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

function tomorrowDate() {
  return format(addDays(new Date(), 1), 'yyyy-MM-dd')
}

function thirtyDaysAgoDate() {
  return format(subDays(new Date(), 29), 'yyyy-MM-dd')
}
