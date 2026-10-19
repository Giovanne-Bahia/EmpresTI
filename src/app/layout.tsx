import type { Metadata } from 'next'
import { Open_Sans } from 'next/font/google'
import type { ReactNode } from 'react'

import './globals.css'

const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'swap',
  variable: '--font-open-sans',
})

export const metadata: Metadata = {
  title: 'EmpresTI',
  description: 'Sistema interno de empréstimo de equipamentos',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR" className={openSans.variable}>
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
