import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hoverable?: boolean
  gradient?: boolean
  border?: boolean
}

export default function Card({ 
  children, 
  className = '', 
  hoverable = false,
  gradient = false,
  border = true
}: CardProps) {
  const baseClasses = 'bg-white rounded-xl shadow-lg p-6'
  const hoverClasses = hoverable ? 'hover:shadow-2xl hover:scale-105 transition-all duration-300' : ''
  const gradientClasses = gradient ? 'bg-gradient-to-br from-white to-gray-50' : ''
  const borderClasses = border ? 'border border-gray-100' : ''
  
  return (
    <div className={`${baseClasses} ${hoverClasses} ${gradientClasses} ${borderClasses} ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ 
  children, 
  className = '' 
}: { 
  children: ReactNode
  className?: string 
}) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ 
  children, 
  className = '' 
}: { 
  children: ReactNode
  className?: string 
}) {
  return (
    <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
      {children}
    </h3>
  )
}

export function CardDescription({ 
  children, 
  className = '' 
}: { 
  children: ReactNode
  className?: string 
}) {
  return (
    <p className={`text-sm text-gray-600 leading-relaxed ${className}`}>
      {children}
    </p>
  )
}