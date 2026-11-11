import Link from 'next/link'
import { Brand, primaryButton } from './_components/ui'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-soft px-6 py-6 sm:px-14">
        <Link href="/" aria-label="EmpresTI — início">
          <Brand />
        </Link>
        <Link href="/login" className={primaryButton}>
          Entrar
          <i className="ph ph-arrow-up-right" aria-hidden="true" />
        </Link>
      </header>
      <main
        aria-label="Landing"
        data-screen-label="Landing"
        className="flex flex-1 flex-col gap-14 px-6 py-14 sm:px-14 lg:gap-20 lg:py-20"
      >
        <section className="grid items-center gap-14 lg:grid-cols-[1.15fr_1fr]">
          <div className="flex max-w-[620px] flex-col gap-8">
            <p className="text-xs uppercase tracking-[.12em] text-accent-400">
              Gestão interna de equipamentos
            </p>
            <h1 className="text-[38px] font-semibold leading-[1.12] tracking-[-.02em] sm:text-[52px]">
              Seu trabalho segue.
              <br />
              <span className="text-accent-300">O equipamento acompanha.</span>
            </h1>
            <p className="max-w-[48ch] text-sm leading-relaxed text-muted">
              Encontre o que precisa para trabalhar. O EmpresTI reúne o catálogo
              e o acompanhamento de empréstimos em um só lugar.
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <Link href="/login" className={primaryButton}>
                Acessar o sistema
                <i className="ph ph-arrow-right" aria-hidden="true" />
              </Link>
              <span className="text-xs text-dim">
                Acesso para colaboradores convidados
              </span>
            </div>
          </div>
          <div
            className="grid grid-cols-2 gap-4 rounded-[14px] border border-frame bg-sunken p-6 sm:p-8"
            aria-label="Equipamentos do catálogo"
          >
            {[
              ['laptop', 'Notebooks'],
              ['monitor', 'Monitores'],
              ['camera', 'Câmeras'],
              ['plugs', 'Acessórios'],
            ].map(([icon, label]) => (
              <div
                key={label}
                className="flex min-h-[150px] flex-col justify-between gap-6 rounded-xl border border-card bg-surface p-5"
              >
                <i
                  className={`ph ph-${icon} text-[40px] text-accent-400`}
                  aria-hidden="true"
                />
                <span className="text-[13px] text-borrowed">{label}</span>
              </div>
            ))}
          </div>
        </section>
        <section
          aria-label="Como funciona"
          className="grid gap-6 border-t border-soft pt-10 sm:grid-cols-3"
        >
          {[
            [
              'magnifying-glass',
              'Consulte o catálogo',
              'Veja os equipamentos e a situação de cada item.',
            ],
            [
              'hand-arrow-down',
              'Organize seus empréstimos',
              'Até 3 itens por pessoa para apoiar sua rotina.',
            ],
            [
              'calendar-check',
              'Acompanhe a devolução',
              'Prazo padrão de 14 dias para devolver.',
            ],
          ].map(([icon, title, copy]) => (
            <div key={title} className="flex flex-col gap-3">
              <i
                className={`ph ph-${icon} text-2xl text-accent-400`}
                aria-hidden="true"
              />
              <h2 className="text-[15px] font-semibold">{title}</h2>
              <p className="max-w-[36ch] text-[13px] leading-relaxed text-muted">
                {copy}
              </p>
            </div>
          ))}
        </section>
      </main>
      <footer className="flex flex-wrap justify-between gap-3 border-t border-soft px-6 py-5 text-[11px] text-dim sm:px-14">
        <span>EmpresTI · Operações</span>
        <span>Empréstimo de equipamentos internos</span>
      </footer>
    </div>
  )
}
