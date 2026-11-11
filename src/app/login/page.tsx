import Link from 'next/link'
import { Brand } from '../_components/ui'
import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <main
      aria-label="01 Login"
      data-screen-label="01 Login"
      className="grid min-h-screen lg:grid-cols-[minmax(400px,560px)_1fr]"
    >
      <section className="flex flex-col justify-between gap-16 bg-[linear-gradient(160deg,#001449_0%,#00102F_60%,#080C1A_100%)] p-7 sm:p-14">
        <Link href="/" aria-label="EmpresTI — início">
          <Brand />
        </Link>
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-[18px]">
            <h2 className="max-w-[20ch] text-[34px] font-semibold leading-[1.15] tracking-[-.01em]">
              O equipamento certo para o seu trabalho.
            </h2>
            <p className="max-w-[38ch] text-sm leading-relaxed text-muted">
              Consulte os equipamentos, acompanhe seus empréstimos e organize a
              próxima devolução.
            </p>
          </div>
          <div className="h-px w-24 bg-gradient-to-r from-accent-600 to-transparent" />
          <div className="flex gap-10">
            <div className="flex flex-col gap-2">
              <span className="text-2xl font-semibold">3 itens</span>
              <span className="text-xs text-muted">por pessoa</span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-2xl font-semibold">14 dias</span>
              <span className="text-xs text-muted">de prazo padrão</span>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-dim">Operações · v1</p>
      </section>
      <section className="flex items-center justify-center px-7 py-14 sm:px-14">
        <LoginForm />
      </section>
    </main>
  )
}
