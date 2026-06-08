import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { TabBar } from './components/TabBar'
import { Toast } from './components/Toast'
import { TodayPage } from './pages/Today'
import { ProgressPage } from './pages/Progress'
import { AchievementsPage } from './pages/Achievements'
import { SettingsPage } from './pages/Settings'
import { ensureSeeded } from './lib/db'
import { evaluateAchievements, getAchievementById } from './lib/achievements'
import { useToastStore } from './store/toastStore'
import { InstallHint } from './components/InstallHint'

function AppContent() {
  const showToast = useToastStore((s) => s.show)

  useEffect(() => {
    ensureSeeded().then(async () => {
      const earned = await evaluateAchievements()
      for (const id of earned) {
        const def = getAchievementById(id)
        if (def) showToast(`Achievement unlocked: ${def.title}`)
      }
    })
  }, [showToast])

  return (
    <div className="mx-auto min-h-full max-w-md bg-background pb-20">
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/achievements" element={<AchievementsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <TabBar />
      <Toast />
      <InstallHint />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
