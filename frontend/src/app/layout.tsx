import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "@/styles/components.css"
import { AuthProvider } from "@/components/providers/AuthProvider"
import { CompanyProvider } from "@/components/providers/CompanyProvider"
import { ToasterProvider } from "@/components/providers/ToasterProvider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "BinaryMLM Platform",
  description: "Production-ready Binary MLM Platform with Whitelabel Support",
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <CompanyProvider>
            <ToasterProvider />
            {children}
          </CompanyProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
