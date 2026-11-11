import type { ComponentProps } from 'react'

export const primaryButton =
  'inline-flex h-11 items-center justify-center gap-3 rounded-lg border border-action bg-transparent px-5 text-[13px] font-semibold text-accent-300 transition-colors duration-150 hover:bg-surface hover:text-accent-100 disabled:cursor-not-allowed disabled:opacity-45'

// Adaptado de shadcn/ui (MIT), registry/new-york-v4/ui/{button,input}.tsx.
// Os estilos usam os tokens do EmpresTI e a única variante necessária é outline.
export function Button({ className = '', ...props }: ComponentProps<'button'>) {
  return (
    <button
      data-slot="button"
      className={`${primaryButton} ${className}`}
      {...props}
    />
  )
}
export function Input({ className = '', ...props }: ComponentProps<'input'>) {
  return (
    <input
      data-slot="input"
      className={`h-[42px] w-full min-w-0 rounded-lg border border-strong bg-sunken px-3 text-sm text-foreground placeholder:text-faint aria-invalid:border-overdue-border disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
      {...props}
    />
  )
}

export function Brand() {
  return (
    <span className="inline-flex items-center gap-[10px] text-base font-semibold tracking-[.02em] text-foreground">
      <span className="flex size-[34px] items-center justify-center rounded-lg border border-accent-700 bg-accent-900 text-accent-300">
        <i className="ph ph-package text-xl" aria-hidden="true" />
      </span>
      <span>
        Empres<span className="text-accent-400">TI</span>
      </span>
    </span>
  )
}
