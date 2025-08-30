import Link from 'next/link'
import { ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  href?: string
  loading?: boolean
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  href,
  loading,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200'
  
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:scale-105',
    secondary: 'bg-white text-gray-900 border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300',
    ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-8 py-3 text-lg'
  }
  
  const isDisabled = disabled || loading
  const disabledClasses = isDisabled ? 'opacity-50 cursor-not-allowed' : ''
  
  const buttonClasses = `${baseClasses} ${variants[variant]} ${sizes[size]} ${disabledClasses} ${className}`
  
  const content = (
    <>
      {loading && (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </>
  )
  
  if (href && !isDisabled) {
    return (
      <Link href={href} className={buttonClasses}>
        {content}
      </Link>
    )
  }
  
  return (
    <button {...props} disabled={isDisabled} className={buttonClasses}>
      {content}
    </button>
  )
}