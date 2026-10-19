type ScreenPlaceholderProps = {
  label: string
}

export function ScreenPlaceholder({ label }: ScreenPlaceholderProps) {
  return <main aria-label={label} data-screen-label={label} />
}
