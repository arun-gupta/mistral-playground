import { Routes, Route } from 'react-router-dom'
import { Toaster } from './components/ui/toaster'
import Layout from './components/Layout'
import Playground from './pages/Playground'
import RAG from './pages/RAG'
import Configs from './pages/Configs'
import Models from './pages/Models'
import Comparison from './pages/Comparison'
import Dashboard from './pages/Dashboard'


function App() {
  return (
    <div className="min-h-screen bg-background">
      <Layout>
        <Routes>
          <Route path="/" element={<Playground />} />
          <Route path="/rag" element={<RAG />} />
          <Route path="/configs" element={<Configs />} />
          <Route path="/models" element={<Models />} />

          <Route path="/comparison" element={<Comparison />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Layout>
      <Toaster />
    </div>
  )
}

export default App 