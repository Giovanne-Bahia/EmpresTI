'use client'
import { Button } from './_components/ui'

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-7">
      <h1 className="text-2xl font-semibold">Serviço indisponível</h1>
      <p className="text-sm text-muted">Tente novamente em alguns instantes.</p>
      <Button onClick={reset}>Tentar novamente</Button>
    </main>
  )
}
