import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MAGS Call Radar',
  description: 'Valuation, trend and Long Call decision dashboard',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>
}
