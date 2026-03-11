import React, { type ReactNode } from 'react'

interface FormFieldProps { label: string; hint?: string; error?: string; required?: boolean; children: ReactNode }

export function FormField({ label, hint, error, required, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-mono text-stone-400 uppercase tracking-wider">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-stone-600">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }
export function Input({ error, className = '', ...props }: InputProps) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2.5 rounded-lg border text-sm bg-stone-800 text-stone-100 placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-forest-500 ${error ? 'border-red-500' : 'border-stone-700'} ${className}`}
    />
  )
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean; children?: ReactNode }
export function Select({ error, className = '', children, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2.5 rounded-lg border text-sm bg-stone-800 text-stone-100 focus:outline-none focus:ring-2 focus:ring-forest-500 ${error ? 'border-red-500' : 'border-stone-700'} ${className}`}
    >
      {children}
    </select>
  )
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }
export function Textarea({ error, className = '', ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2.5 rounded-lg border text-sm resize-none bg-stone-800 text-stone-100 placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-forest-500 ${error ? 'border-red-500' : 'border-stone-700'} ${className}`}
    />
  )
}
