import { useProjectStore } from './store/projectStore'
import { WelcomeScreen } from './screens/WelcomeScreen'
import { AppShell } from './components/layout/AppShell'

export default function App() {
  const isOpen = useProjectStore(s => s.isOpen)
  return isOpen ? <AppShell /> : <WelcomeScreen />
}
