'use client'

import { useState } from 'react'
import Link from 'next/link'

import { equipment, normalize } from './equipment'

const categories = [
  'Todos',
  'Notebooks',
  'Monitores',
  'Câmeras',
  'Acessórios',
  'Projetores',
]
const statusStyles = {
  Disponível: 'border-available-border bg-available-background text-available',
  Emprestado: 'border-borrowed-border bg-borrowed-background text-borrowed',
  Manutenção:
    'border-maintenance-border bg-maintenance-background text-maintenance',
}

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <i aria-hidden="true" className={`ph ph-${name} ${className}`} />
}

export function CatalogDemo() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todos')
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const filtered = equipment.filter(
    (item) =>
      normalize(`${item.name} ${item.asset}`).includes(normalize(query)) &&
      (category === 'Todos' || item.category === category) &&
      (!onlyAvailable || item.status === 'Disponível'),
  )
  const hasFilters = query !== '' || category !== 'Todos' || onlyAvailable

  function clearFilters() {
    setQuery('')
    setCategory('Todos')
    setOnlyAvailable(false)
  }

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[236px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-[26px] border-b border-soft bg-sidebar px-[14px] py-[22px] lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-2">
          <Link
            href="/catalogo"
            aria-label="EmpresTI — catálogo"
            className="flex items-center gap-[10px] text-foreground"
          >
            <span className="flex size-8 items-center justify-center rounded-lg border border-accent-700 bg-accent-900 text-lg text-accent-300">
              <Icon name="package" />
            </span>
            <span className="text-sm font-semibold tracking-[.02em]">
              Empres<span className="text-accent-400">TI</span>
            </span>
          </Link>
          <button
            type="button"
            aria-label="Alternar navegação"
            aria-expanded={menuOpen}
            aria-controls="catalog-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex size-9 items-center justify-center rounded-lg border border-frame text-accent-300 lg:hidden"
          >
            <Icon name={menuOpen ? 'x' : 'list'} />
          </button>
        </div>
        <nav
          id="catalog-navigation"
          aria-label="Navegação principal"
          className={`${menuOpen ? 'flex' : 'hidden'} flex-1 flex-col justify-between gap-[26px] lg:flex`}
        >
          <div className="flex flex-col gap-[26px]">
            <div className="flex flex-col gap-2">
              <p className="px-2 text-[10px] uppercase tracking-[.12em] text-dim">
                Colaborador
              </p>
              <div className="flex flex-col gap-[3px]">
                <Link
                  href="/catalogo"
                  aria-current="page"
                  className="flex items-center gap-[10px] rounded-lg border-l-2 border-action bg-surface px-[10px] py-[9px] text-[13px] text-foreground"
                >
                  <Icon
                    name="squares-four"
                    className="text-base text-accent-400"
                  />
                  Catálogo
                </Link>
                <button
                  disabled
                  title="Disponível em uma próxima etapa"
                  className="flex items-center gap-[10px] rounded-lg px-[10px] py-[9px] text-left text-[13px] text-muted disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Icon name="hand-arrow-down" className="text-base" />
                  Meus empréstimos
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <p className="px-2 text-[10px] uppercase tracking-[.12em] text-dim">
                Operações
              </p>
              <button
                disabled
                title="Disponível em uma próxima etapa"
                className="flex items-center gap-[10px] rounded-lg px-[10px] py-[9px] text-left text-[13px] text-muted disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Icon name="list-checks" className="text-base" />
                Empréstimos em aberto
              </button>
              <button
                disabled
                title="Disponível em uma próxima etapa"
                className="flex items-center gap-[10px] rounded-lg px-[10px] py-[9px] text-left text-[13px] text-muted disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Icon name="plus-square" className="text-base" />
                Cadastrar equipamento
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-2 px-2 text-[11px] leading-relaxed text-dim">
              <Icon name="info" className="text-base" />
              <p>Outras telas estarão disponíveis nas próximas etapas.</p>
            </div>
            <div className="flex items-center gap-[10px] rounded-[10px] border border-soft bg-sunken p-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-800 text-[11px] font-semibold text-accent-300">
                DE
              </span>
              <div className="flex flex-col gap-[3px]">
                <p className="text-xs font-semibold">Colaborador de exemplo</p>
                <p className="text-[11px] text-dim">Perfil de demonstração</p>
              </div>
            </div>
          </div>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex min-h-16 flex-wrap items-center justify-between gap-4 border-b border-soft px-5 py-3 sm:px-7">
          <label className="flex h-9 w-full max-w-[420px] items-center gap-2 rounded-lg border border-frame bg-sunken px-3 focus-within:border-action sm:flex-1">
            <Icon name="magnifying-glass" className="text-base text-dim" />
            <input
              aria-label="Buscar equipamento ou patrimônio"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar equipamento ou patrimônio"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-dim focus-visible:outline-none"
            />
            {query && (
              <button
                type="button"
                aria-label="Limpar busca"
                onClick={() => setQuery('')}
                className="flex size-6 items-center justify-center text-muted"
              >
                <Icon name="x" />
              </button>
            )}
          </label>
          <div className="flex items-center gap-4 text-xs text-muted">
            <span className="hidden sm:inline">Ambiente de demonstração</span>
            <span className="rounded-full border border-accent-700 bg-accent-900 px-3 py-[5px] text-[11px] text-accent-300">
              Demo
            </span>
          </div>
        </header>

        <main
          aria-label="02 Catálogo"
          data-screen-label="02 Catálogo"
          className="flex flex-1 flex-col gap-[22px] px-5 py-8 sm:px-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-[6px]">
              <div className="flex items-center gap-[10px]">
                <h1 className="text-2xl font-semibold tracking-[-.01em]">
                  Catálogo
                </h1>
                <span className="rounded-md border border-frame px-[7px] py-[3px] text-[10px] uppercase tracking-[.08em] text-dim">
                  Equipamentos
                </span>
              </div>
              <p className="text-[13px] text-muted">
                {equipment.length} equipamentos ·{' '}
                {
                  equipment.filter((item) => item.status === 'Disponível')
                    .length
                }{' '}
                disponíveis agora
              </p>
            </div>
            <span className="flex items-center gap-[6px] text-[11px] text-dim">
              <span className="size-[5px] rounded-full bg-available" />
              Inventário de exemplo
            </span>
          </div>

          <section
            aria-label="Regras de empréstimo"
            className="flex items-start gap-3 rounded-[10px] border border-accent-700 bg-gradient-to-r from-surface to-sunken px-4 py-[13px]"
          >
            <Icon name="info" className="text-lg text-accent-400" />
            <div className="flex flex-col gap-[5px]">
              <h2 className="text-[13px] font-semibold">
                O que saber antes de pegar emprestado
              </h2>
              <p className="max-w-[100ch] text-xs leading-relaxed text-borrowed">
                Até 3 itens por pessoa, por 14 dias. Itens em atraso bloqueiam
                novos empréstimos. Equipamentos em manutenção não estão
                disponíveis.
              </p>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div
              role="group"
              aria-label="Filtrar por categoria"
              className="flex flex-wrap gap-2"
            >
              {categories.map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={category === value}
                  onClick={() => setCategory(value)}
                  className={`rounded-full border px-3 py-[6px] text-xs transition-colors duration-[140ms] ${category === value ? 'border-accent-700 bg-accent-800 text-accent-200' : 'border-frame text-borrowed hover:border-accent-600 hover:text-foreground'}`}
                >
                  {value}
                </button>
              ))}
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-borrowed">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(event) => setOnlyAvailable(event.target.checked)}
                className="size-4 accent-[var(--accent-500)]"
              />
              Só disponíveis
            </label>
          </div>

          <div className="flex items-center justify-between gap-4 text-[11px] text-dim">
            <p role="status" aria-live="polite">
              {filtered.length}{' '}
              {filtered.length === 1
                ? 'equipamento encontrado'
                : 'equipamentos encontrados'}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-accent-400 hover:text-accent-300"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {filtered.length ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((item) => (
                <article
                  key={item.asset}
                  aria-label={item.name}
                  className="flex min-h-[206px] flex-col gap-3 rounded-xl border border-card bg-surface p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex size-10 items-center justify-center rounded-[9px] border border-soft bg-sunken text-[21px] text-accent-400">
                      <Icon name={item.icon} />
                    </span>
                    <span
                      className={`rounded-full border px-[9px] py-[3px] text-[11px] font-semibold ${statusStyles[item.status]}`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <div className="flex flex-col gap-[5px]">
                    <h2 className="text-[14.5px] font-semibold">{item.name}</h2>
                    <p className="text-xs text-dim">
                      {item.category} · {item.asset}
                    </p>
                    <p className="text-xs leading-relaxed text-muted">
                      {item.description}
                    </p>
                  </div>
                  <div className="flex flex-1 items-end">
                    <p
                      className={`w-full border-t border-soft pt-3 text-[11px] ${item.status === 'Disponível' ? 'text-accent-400' : 'text-dim'}`}
                    >
                      {item.note}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-frame bg-sunken p-8 text-center">
              <Icon name="magnifying-glass" className="text-[32px] text-dim" />
              <div className="flex flex-col gap-2">
                <h2 className="text-[15px] font-semibold">
                  Nenhum equipamento encontrado
                </h2>
                <p className="text-[13px] text-muted">
                  Tente outro termo ou ajuste os filtros.
                </p>
              </div>
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg border border-action px-4 py-2 text-xs font-semibold text-accent-300"
              >
                Limpar filtros
              </button>
            </div>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-soft pt-5 text-[11px] text-dim">
            <p>
              Demonstração com dados fictícios. Empréstimos não são registrados.
            </p>
            <span>EmpresTI · Operações · v1</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
