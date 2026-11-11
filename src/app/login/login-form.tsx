'use client'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { authMessages, signInSchema } from '@/shared/auth'
import { trpc, type RouterInputs } from '../_components/providers'
import { Button, Input } from '../_components/ui'

export function LoginForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RouterInputs['auth']['signIn']>({
    resolver: zodResolver(signInSchema),
  })
  const login = trpc.auth.signIn.useMutation({
    onSuccess: () => {
      queryClient.clear()
      router.replace('/catalogo')
      router.refresh()
    },
  })
  const code = login.error?.data?.code
  const message = login.error
    ? (authMessages[code as keyof typeof authMessages] ??
      authMessages.SERVICE_UNAVAILABLE)
    : null
  return (
    <form
      onSubmit={handleSubmit((values) => login.mutate(values))}
      className="flex w-full max-w-[372px] flex-col gap-8"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-[22px] font-semibold">Entrar</h1>
        <p className="text-[13px] leading-relaxed text-muted">
          Acesse o catálogo com sua conta do EmpresTI.
        </p>
      </div>
      <div className="flex flex-col gap-[18px]">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-xs text-borrowed">
            E-mail
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="seu.nome@empresa.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
          />
          {errors.email && (
            <p id="email-error" className="text-xs text-overdue">
              {errors.email.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-xs text-borrowed">
            Senha
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Sua senha"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password')}
          />
          {errors.password && (
            <p id="password-error" className="text-xs text-overdue">
              {errors.password.message}
            </p>
          )}
        </div>
      </div>
      {message && (
        <p
          role="alert"
          className="rounded-lg border border-overdue-border bg-overdue-background p-3 text-xs leading-relaxed text-overdue"
        >
          {message}
        </p>
      )}
      <Button type="submit" disabled={login.isPending}>
        {login.isPending ? 'Entrando…' : 'Entrar'}
        <i className="ph ph-arrow-right text-base" aria-hidden="true" />
      </Button>
      <div className="border-t border-soft pt-6 text-center text-xs leading-relaxed text-dim">
        Acesso por convite. Para obter uma conta ou recuperar o acesso, procure
        Operações.
      </div>
    </form>
  )
}
