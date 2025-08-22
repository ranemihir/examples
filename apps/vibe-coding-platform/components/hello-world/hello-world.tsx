'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface HelloWorldProps {
  className?: string
}

export function HelloWorld({ className }: HelloWorldProps) {
  const [clicked, setClicked] = useState(false)
  const [clickCount, setClickCount] = useState(0)

  const handleClick = () => {
    setClicked(true)
    setClickCount(prev => prev + 1)
    setTimeout(() => setClicked(false), 2000)
  }

  return (
    <div className={`flex flex-col items-center justify-center p-8 space-y-6 ${className || ''}`}>
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          Hello World! 👋
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-md">
          Welcome to the Vercel Examples repository! This is a simple Hello World component 
          built with Next.js, TypeScript, and Tailwind CSS.
        </p>
      </div>
      
      <div className="flex flex-col items-center space-y-4">
        <Button 
          onClick={handleClick}
          variant="default"
          className="px-6 py-2 transition-all duration-200 hover:scale-105"
        >
          {clicked ? '🎉 Hello!' : 'Click Me!'}
        </Button>
        
        {clickCount > 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Button clicked {clickCount} time{clickCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          This component demonstrates basic React hooks, TypeScript props, and Tailwind CSS styling
        </p>
      </div>
    </div>
  )
}