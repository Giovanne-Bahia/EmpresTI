/* eslint-disable @next/next/no-img-element -- Fotos já padronizadas no Storage; img sem estilos inline mantém a CSP restritiva. */
'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { trpc, type RouterOutputs } from './providers'
import { Brand, Button, Input } from './ui'
import { businessMessages, formatDue } from '@/shared/loans'

type Item = RouterOutputs['equipment']['byPatrimonio']
const labels = {
  disponivel: 'Disponível',
  emprestado: 'Emprestado',
  manutencao: 'Manutenção',
}
const colors = {
  disponivel: 'border-available-border bg-available-background text-available',
  emprestado: 'border-borrowed-border bg-borrowed-background text-borrowed',
  manutencao:
    'border-maintenance-border bg-maintenance-background text-maintenance',
}
const categories = [
  { value: undefined, label: 'Todos' },
  { value: 'notebook', label: 'Notebooks' },
  { value: 'monitor', label: 'Monitores' },
  { value: 'cabo', label: 'Cabos' },
  { value: 'camera', label: 'Câmeras' },
] as const
function Photo({ item }: { item: Item }) {
  return (
    <img
      src={item.imageUrl}
      alt={`Imagem ilustrativa de ${item.name}`}
      width={800}
      height={600}
      className="aspect-[4/3] w-full rounded-lg bg-sunken object-cover"
    />
  )
}
function Pill({ item }: { item: Item }) {
  return (
    <span
      className={`w-fit rounded-full border px-[9px] py-[3px] text-[11px] font-semibold ${colors[item.status]}`}
    >
      {labels[item.status]}
    </span>
  )
}
function Limit({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted">{count} de 3 itens com você</span>
      <div
        aria-label={`${count} de 3 itens`}
        className="flex w-[180px] gap-[5px]"
      >
        {[0, 1, 2].map((n) => (
          <span
            key={n}
            className={`h-[5px] flex-1 rounded-full ${n < count ? 'bg-action' : 'bg-frame'}`}
          />
        ))}
      </div>
    </div>
  )
}

export function EquipmentApp({
  mode,
  patrimonio = '',
}: {
  mode: 'catalog' | 'detail' | 'mine'
  patrimonio?: string
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const utils = trpc.useUtils()
  const me = trpc.auth.me.useQuery({}, { retry: false })
  const ready = !!me.data
  const polling = {
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    enabled: ready,
  }
  const summary = trpc.loan.summary.useQuery({}, polling)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<
    'notebook' | 'monitor' | 'cabo' | 'camera' | undefined
  >()
  const [availableOnly, setAvailableOnly] = useState(false)
  const catalog = trpc.equipment.list.useInfiniteQuery(
    { search, category, availableOnly, limit: 24 },
    {
      ...polling,
      enabled: ready && mode === 'catalog',
      getNextPageParam: (page) => page.nextCursor,
    },
  )
  const detail = trpc.equipment.byPatrimonio.useQuery(
    { patrimonio },
    { ...polling, enabled: ready && mode === 'detail' },
  )
  const mine = trpc.loan.mine.useInfiniteQuery(
    { limit: 24 },
    {
      ...polling,
      enabled: ready && mode === 'mine',
      getNextPageParam: (page) => page.nextCursor,
    },
  )
  const dialog = useRef<HTMLDialogElement>(null)
  const [candidate, setCandidate] = useState<Item | null>(null)
  const [requestId, setRequestId] = useState('')
  const borrow = trpc.loan.request.useMutation({
    onSuccess: async () => {
      dialog.current?.close()
      await Promise.all([utils.equipment.invalidate(), utils.loan.invalidate()])
      router.push('/meus-emprestimos')
    },
  })
  const logout = trpc.auth.signOut.useMutation({
    onSuccess: () => {
      queryClient.clear()
      router.replace('/login')
      router.refresh()
    },
  })
  const items = catalog.data?.pages.flatMap((page) => page.items) ?? []
  const loans = mine.data?.pages.flatMap((page) => page.items) ?? []
  const count = summary.data?.openCount ?? 0
  const block = summary.data?.blockedReason
  const failure = borrow.error?.data?.businessCode
  const title =
    mode === 'catalog'
      ? 'Catálogo'
      : mode === 'mine'
        ? 'Meus empréstimos'
        : (detail.data?.name ?? 'Detalhe do item')
  const screenLabel =
    mode === 'catalog'
      ? '02 Catálogo'
      : mode === 'mine'
        ? '04 Meus empréstimos'
        : '03 Detalhe do item'
  function confirm(item: Item) {
    borrow.reset()
    setCandidate(item)
    setRequestId(crypto.randomUUID())
    dialog.current?.showModal()
  }
  const navClass = (active: boolean) =>
    `rounded-lg border px-3 py-[9px] text-[13px] ${active ? 'border-action bg-surface text-foreground' : 'border-transparent text-muted hover:bg-sunken'}`
  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[236px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-[26px] border-b border-soft bg-sidebar px-[14px] py-[22px] lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <Link href="/catalogo" aria-label="EmpresTI — catálogo">
          <Brand />
        </Link>
        <nav
          aria-label="Navegação principal"
          className="flex flex-1 flex-col gap-2"
        >
          <span className="px-3 text-[10px] uppercase tracking-[.12em] text-dim">
            Colaborador
          </span>
          <Link
            href="/catalogo"
            aria-current={mode === 'catalog' ? 'page' : undefined}
            className={navClass(mode === 'catalog')}
          >
            Catálogo
          </Link>
          <Link
            href="/meus-emprestimos"
            aria-current={mode === 'mine' ? 'page' : undefined}
            className={navClass(mode === 'mine')}
          >
            Meus empréstimos · {count}
          </Link>
        </nav>
        <div className="flex flex-col gap-3 rounded-[10px] border border-soft bg-sunken p-3">
          <span className="truncate text-xs" title={me.data?.email}>
            {me.data?.email ?? 'Carregando sua conta…'}
          </span>
          <span className="text-[11px] text-dim">
            {me.data?.role === 'admin' ? 'Operações' : 'Colaborador'}
          </span>
          <Button onClick={() => logout.mutate({})} disabled={logout.isPending}>
            Sair
          </Button>
          {logout.error && (
            <p role="alert" className="text-xs text-overdue">
              Não foi possível sair. Tente novamente.
            </p>
          )}
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex min-h-16 flex-wrap items-center justify-between gap-4 border-b border-soft px-5 py-3 sm:px-7">
          {mode === 'catalog' ? (
            <Input
              aria-label="Buscar equipamento ou patrimônio"
              placeholder="Buscar equipamento ou patrimônio"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-[420px]"
            />
          ) : (
            <Link href="/catalogo" className="text-xs text-accent-400">
              Catálogo / {mode === 'mine' ? 'Meus empréstimos' : patrimonio}
            </Link>
          )}
          <span className="text-xs text-muted">
            {count} de 3 itens com você
          </span>
        </header>
        <main
          aria-label={screenLabel}
          data-screen-label={screenLabel}
          className="flex flex-col gap-[22px] px-5 py-8 sm:px-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold tracking-[-.01em]">
              {title}
            </h1>
            {mode === 'mine' && (
              <Link
                href="/catalogo"
                className="rounded-lg border border-action px-4 py-2 text-xs text-accent-300"
              >
                Pegar emprestado
              </Link>
            )}
          </div>
          {me.error && (
            <p role="alert" className="text-sm text-overdue">
              Sua sessão não pôde ser carregada.{' '}
              <Link href="/login">Entrar novamente</Link>
            </p>
          )}
          {summary.error && (
            <p role="alert" className="text-sm text-overdue">
              Não foi possível carregar seus limites. Tente atualizar a página.
            </p>
          )}
          {block && (
            <p
              role="alert"
              className="rounded-lg border border-overdue-border bg-overdue-background p-4 text-sm text-overdue"
            >
              {businessMessages[block]}
            </p>
          )}
          {mode === 'catalog' && (
            <>
              <p className="text-[13px] text-muted">
                {catalog.data?.pages[0]?.total ?? 0} equipamentos ·{' '}
                {catalog.data?.pages[0]?.availableCount ?? 0} disponíveis agora
              </p>
              <section
                aria-label="Regras de empréstimo"
                className="rounded-[10px] border border-accent-700 bg-surface p-4 text-xs leading-relaxed text-borrowed"
              >
                Até 3 itens por pessoa, por 14 dias corridos. Atraso bloqueia
                novos empréstimos. Manutenção não está disponível para
                solicitar.
              </section>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div
                  role="group"
                  aria-label="Filtrar por categoria"
                  className="flex flex-wrap gap-2"
                >
                  {categories.map((option) => (
                    <button
                      key={option.label}
                      aria-pressed={category === option.value}
                      onClick={() => setCategory(option.value)}
                      className={`rounded-full border px-3 py-[6px] text-xs ${category === option.value ? 'border-accent-700 bg-accent-800 text-accent-200' : 'border-frame text-borrowed'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-xs text-borrowed">
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(e) => setAvailableOnly(e.target.checked)}
                  />
                  Só disponíveis
                </label>
              </div>
              {(search || category || availableOnly) && (
                <button
                  className="w-fit text-xs text-accent-400"
                  onClick={() => {
                    setSearch('')
                    setCategory(undefined)
                    setAvailableOnly(false)
                  }}
                >
                  Limpar filtros
                </button>
              )}
              {catalog.isLoading && (
                <p role="status" className="text-sm text-muted">
                  Carregando equipamentos…
                </p>
              )}
              {catalog.error && (
                <p role="alert" className="text-sm text-overdue">
                  Não foi possível carregar o catálogo.{' '}
                  <button onClick={() => catalog.refetch()}>
                    Tentar novamente
                  </button>
                </p>
              )}
              {!catalog.isLoading && !catalog.error && !items.length && (
                <div className="rounded-xl border border-dashed border-frame bg-sunken p-8">
                  <h2 className="font-semibold">
                    Nenhum equipamento encontrado
                  </h2>
                  <p className="text-sm text-muted">
                    Ajuste os filtros ou confira o carregamento do inventário.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <article
                    key={item.id}
                    aria-label={item.name}
                    className="flex flex-col gap-3 rounded-xl border border-card bg-surface p-4"
                  >
                    <Photo item={item} />
                    <Pill item={item} />
                    <h2 className="text-[14.5px] font-semibold">{item.name}</h2>
                    <p className="text-xs text-dim">
                      {item.category} · {item.patrimonio}
                    </p>
                    {item.dueAt && (
                      <p className="text-xs text-muted">
                        Devolver até {formatDue(item.dueAt)}
                      </p>
                    )}
                    {item.status === 'disponivel' ? (
                      <Link
                        href={`/catalogo/${item.patrimonio}`}
                        className="text-xs text-accent-400"
                      >
                        Ver item e solicitar →
                      </Link>
                    ) : (
                      <p className="text-xs text-dim">
                        Indisponível para solicitar
                      </p>
                    )}
                  </article>
                ))}
              </div>
              {catalog.hasNextPage && (
                <Button
                  onClick={() => catalog.fetchNextPage()}
                  disabled={catalog.isFetchingNextPage}
                >
                  Carregar mais
                </Button>
              )}
            </>
          )}
          {mode === 'detail' && (
            <>
              {detail.isLoading && <p role="status">Carregando item…</p>}
              {detail.error && (
                <p role="alert" className="text-overdue">
                  {detail.error.data?.code === 'NOT_FOUND'
                    ? 'Equipamento não encontrado.'
                    : 'Não foi possível carregar este item.'}
                </p>
              )}
              {detail.data && (
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_356px]">
                  <section className="flex flex-col gap-4">
                    <Photo item={detail.data} />
                    <Pill item={detail.data} />
                    <p className="text-xs text-dim">
                      Imagem ilustrativa · {detail.data.patrimonio}
                    </p>
                    <p className="text-sm text-muted">
                      Categoria: {detail.data.category}
                    </p>
                    <p className="text-sm text-muted">
                      Retirada no suporte de TI
                    </p>
                    {detail.data.dueAt && (
                      <p className="text-sm">
                        Devolver até {formatDue(detail.data.dueAt)}
                      </p>
                    )}
                  </section>
                  <section className="flex flex-col gap-5 rounded-xl border border-card bg-surface p-5">
                    <h2 className="text-[17px] font-semibold">
                      Solicitar empréstimo
                    </h2>
                    <p className="text-sm text-muted">
                      Prazo padrão: 14 dias corridos
                    </p>
                    <p className="text-sm text-accent-300">
                      Devolver até{' '}
                      {formatDue(
                        new Date(
                          (summary.data?.now.getTime() ?? 0) + 14 * 86400000,
                        ),
                      )}
                    </p>
                    <Limit count={count} />
                    <Button
                      disabled={
                        !summary.data?.canBorrow ||
                        detail.data.status !== 'disponivel'
                      }
                      onClick={() => detail.data && confirm(detail.data)}
                    >
                      Solicitar
                    </Button>
                    {detail.data.status !== 'disponivel' && (
                      <p className="text-xs text-muted">
                        Este item está{' '}
                        {labels[detail.data.status].toLowerCase()}.
                      </p>
                    )}
                  </section>
                </div>
              )}
            </>
          )}
          {mode === 'mine' && (
            <>
              <Limit count={count} />
              {mine.isLoading && <p role="status">Carregando empréstimos…</p>}
              {mine.error && (
                <p role="alert" className="text-overdue">
                  Não foi possível carregar seus empréstimos.{' '}
                  <button onClick={() => mine.refetch()}>
                    Tentar novamente
                  </button>
                </p>
              )}
              {!mine.isLoading && !mine.error && !loans.length && (
                <p className="rounded-xl border border-frame bg-sunken p-6 text-sm text-muted">
                  Você não tem empréstimos em aberto.
                </p>
              )}
              <div className="flex flex-col gap-4">
                {loans.map((loan) => {
                  const now =
                    summary.data?.now.getTime() ?? loan.borrowedAt.getTime()
                  const overdue = loan.dueAt.getTime() <= now
                  const elapsed = Math.min(
                    1,
                    Math.max(
                      0,
                      (now - loan.borrowedAt.getTime()) /
                        (loan.dueAt.getTime() - loan.borrowedAt.getTime()),
                    ),
                  )
                  return (
                    <article
                      key={loan.id}
                      className={`flex flex-wrap items-center justify-between gap-[18px] rounded-xl border p-5 ${overdue ? 'border-overdue-border bg-overdue-background' : 'border-card bg-surface'}`}
                    >
                      <div className="flex flex-col gap-2">
                        <h2 className="text-[15px] font-semibold">
                          {loan.equipment.name}
                        </h2>
                        <p className="text-xs text-muted">
                          {loan.equipment.patrimonio} · Retirada{' '}
                          {formatDue(loan.borrowedAt)}
                        </p>
                      </div>
                      <div className="flex w-[220px] flex-col gap-2">
                        <p
                          className={`text-xs ${overdue ? 'text-overdue' : 'text-accent-300'}`}
                        >
                          {overdue ? 'Em atraso · ' : 'Devolver até '}
                          {formatDue(loan.dueAt)}
                        </p>
                        <progress
                          aria-label={`Prazo de ${loan.equipment.name}`}
                          value={elapsed}
                          max={1}
                          className="h-1 w-full overflow-hidden rounded-full accent-[var(--accent-500)]"
                        />
                      </div>
                    </article>
                  )
                })}
              </div>
              {mine.hasNextPage && (
                <Button
                  onClick={() => mine.fetchNextPage()}
                  disabled={mine.isFetchingNextPage}
                >
                  Carregar mais
                </Button>
              )}
            </>
          )}
          <footer className="border-t border-soft pt-5 text-[11px] text-dim">
            <a
              href="https://pixabay.com/"
              target="_blank"
              rel="noreferrer"
              className="text-accent-400"
            >
              Fotos: Pixabay
            </a>
          </footer>
        </main>
      </div>
      <dialog
        ref={dialog}
        aria-labelledby="loan-confirm-title"
        onCancel={(event) => {
          if (borrow.isPending) event.preventDefault()
        }}
        className="w-[calc(100%-32px)] max-w-[432px] rounded-[14px] border border-frame bg-surface p-6 text-foreground backdrop:bg-[rgba(4,6,14,0.68)]"
      >
        <div className="flex flex-col gap-5">
          <h2 id="loan-confirm-title" className="text-[19px] font-semibold">
            Confirmar empréstimo
          </h2>
          <p className="text-sm text-muted">
            {candidate?.name} · {candidate?.patrimonio}
          </p>
          <p className="text-sm">
            Retirada no suporte de TI. Devolução prevista:{' '}
            {formatDue(
              new Date((summary.data?.now.getTime() ?? 0) + 14 * 86400000),
            )}
            .
          </p>
          {count === 2 && (
            <p className="rounded-lg border border-accent-700 bg-sunken p-3 text-xs text-accent-300">
              Você ficará com 3 de 3 itens. O limite será atingido.
            </p>
          )}
          {borrow.error && (
            <p role="alert" className="text-sm text-overdue">
              {failure
                ? businessMessages[failure]
                : 'Não foi possível concluir. Tente novamente.'}
            </p>
          )}
          <div className="flex justify-end gap-[10px]">
            <Button
              autoFocus
              disabled={borrow.isPending}
              onClick={() => dialog.current?.close()}
            >
              Cancelar
            </Button>
            <Button
              disabled={borrow.isPending || !candidate}
              onClick={() =>
                candidate &&
                borrow.mutate({ patrimonio: candidate.patrimonio, requestId })
              }
            >
              {borrow.isPending ? 'Confirmando…' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  )
}
