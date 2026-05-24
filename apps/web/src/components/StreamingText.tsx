"use client"

import { useState, useEffect } from 'react'

interface StreamingTextProps {
  text: string
  speed?: number
  onComplete?: () => void
}

export default function StreamingText({ text, speed = 20, onComplete }: StreamingTextProps) {
  const [displayed, setDisplayed] = useState('')

  useEffect(() => {
    let i = 0
    setDisplayed('')
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, ++i))
      if (i >= text.length) {
        clearInterval(interval)
        onComplete?.()
      }
    }, speed)

    return () => clearInterval(interval)
  }, [text, speed, onComplete])

  return (
    <span>
      {displayed}
      <span className="cursor-blink">|</span>
    </span>
  )
}
