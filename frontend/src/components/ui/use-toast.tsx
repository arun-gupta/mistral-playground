import { useState, useCallback } from 'react'

export interface ToastProps {
  id?: number
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
  duration?: number
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const toast = useCallback(({ title, description, variant = 'default', duration = 5000 }: ToastProps) => {
    const id = Date.now()
    const newToast = { id, title, description, variant, duration }
    
    setToasts(prev => [...prev, newToast])
    
    // Auto remove after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
    
    // Log to console for now (in a real app, this would show a UI toast)
    console.log(`Toast: ${title} - ${description}`)
  }, [])

  return { toast, toasts }
} 