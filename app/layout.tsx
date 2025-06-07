import type { Metadata } from 'next'
import { Inter, Noto_Sans_TC } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter'
})
const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  variable: '--font-noto-sans-tc'
})

export const metadata: Metadata = {
  title: 'Hong Kong Ombudsman Reports | 香港申訴專員公署報告',
  description: 'Search and download Hong Kong Ombudsman reports | 搜尋及下載香港申訴專員公署報告',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-HK">
      <body className={`${inter.variable} ${notoSansTC.variable} font-sans`}>
        {children}
      </body>
    </html>
  )
}