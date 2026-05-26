import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WORKSHOPPortal — Área do Aluno',
  description: 'Plataforma de membros do Método TEN',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
