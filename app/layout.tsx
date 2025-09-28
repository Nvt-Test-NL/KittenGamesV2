import "./globals.css"
import { Inter } from "next/font/google"
import type React from "react"
import { GameLaunchSettingsProvider } from "../components/GameLaunchSettingsPanel"
import { HotkeysProvider } from "../components/HotkeysSettingsPanel"
import HotkeysManager from "../components/HotkeysManager"
import HotkeysHelpOverlay from "../components/HotkeysHelpOverlay"
import CloakManager from "../components/CloakManager"
import SyncManager from "../components/SyncManager"
import PresenceManager from "../components/PresenceManager"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "KittenGames",
  description: "Free unblocked games!",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
  <link rel="preconnect" href="https://image.tmdb.org" />
  <link rel="preconnect" href="https://images.ctfassets.net" />
  <link rel="preconnect" href="https://ssl.gstatic.com" />
  <meta name="google-adsense-account" content="ca-pub-4865118146627791" />
  <script
    async
    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4865118146627791"
    crossOrigin="anonymous"
  />
  <script async src="https://cloud.umami.is/script.js" data-website-id="1f0a416d-67e8-435f-b6ec-9af2a2fa359f"></script>
      </head>
      <body className={`${inter.className} bg-[rgb(var(--background))] text-[rgb(var(--foreground))]`}>
        <GameLaunchSettingsProvider>
          <HotkeysProvider>
            <HotkeysManager />
            <HotkeysHelpOverlay />
            <CloakManager />
            <SyncManager />
            <PresenceManager />
            {children}
          </HotkeysProvider>
        </GameLaunchSettingsProvider>
      </body>
    </html>
  )
}
