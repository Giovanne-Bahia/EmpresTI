import 'server-only'
import { cookies } from 'next/headers'
import { createContext } from './context'
import { appRouter } from './root'

export async function readViewer() {
  const store = await cookies()
  const ctx = await createContext(store.getAll())
  return appRouter.createCaller(ctx).auth.me({})
}
