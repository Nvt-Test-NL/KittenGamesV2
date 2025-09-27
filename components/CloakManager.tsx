"use client"

import { useState, useEffect } from "react"
import CloakOverlay from "./CloakOverlay"

interface CloakSettings {
  enabled: boolean
  tabName: string
  tabIcon: string
  // Deprecated fields kept for backward compatibility
  pageContent: string
  backgroundColor: string
  textColor: string
  presetName: string
  // New overlay fields
  overlayType?: 'html' | 'image'
  overlayHtml?: string
  overlayImage?: string
  overlayName?: string
  fillMode?: 'contain' | 'cover' | 'fill' | 'scale-down' | 'none'
}

interface CloakMessage {
  type: 'CLOAK_UPDATE'
  settings: CloakSettings
}

export default function CloakManager() {
  const [cloakSettings, setCloakSettings] = useState<CloakSettings>({
    enabled: false,
    tabName: "KittenGames",
    tabIcon: "/favicon.ico",
    pageContent: "📘 Study Notes",
    backgroundColor: "#ffffff",
    textColor: "#333333",
  presetName: "",
  overlayType: 'html',
  overlayHtml: "<div style=\"text-align:center\"><h1>📘 Study Notes</h1><p>Welcome back!</p></div>",
  overlayImage: "",
  overlayName: "Study Notes (HTML)",
  fillMode: 'contain',
  })

  const [broadcastChannel, setBroadcastChannel] = useState<BroadcastChannel | null>(null)
  const [originalTitle, setOriginalTitle] = useState("")
  const [originalIcon, setOriginalIcon] = useState("")

  // Apply cloak to the current tab
  const applyCloakToTab = (settings: CloakSettings) => {
    if (settings.enabled && !settings.tabName) return // Don't apply if overlay mode without tab info
    
    const targetTitle = settings.tabName || originalTitle
    const targetIcon = settings.tabIcon || originalIcon

    // Update document title
    document.title = targetTitle

    // Update favicon
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
    if (favicon) {
      favicon.href = targetIcon
    } else {
      const newFavicon = document.createElement("link")
      newFavicon.rel = "icon"
      newFavicon.href = targetIcon
      document.head.appendChild(newFavicon)
    }
  }

  // Restore original tab appearance
  const restoreOriginalTab = () => {
    document.title = originalTitle
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
    if (favicon) {
      favicon.href = originalIcon
    }
  }

  // Broadcast settings to other tabs
  const broadcastSettings = (settings: CloakSettings) => {
    if (broadcastChannel) {
      const message: CloakMessage = {
        type: 'CLOAK_UPDATE',
        settings
      }
      broadcastChannel.postMessage(message)
    }
  }

  // Save settings to localStorage
  const saveSettings = (settings: CloakSettings) => {
    localStorage.setItem("cloakSettings", JSON.stringify(settings))
    
    // Also save individual items for backwards compatibility
    localStorage.setItem("cloakedPresetName", settings.presetName)
    localStorage.setItem("cloakedTabName", settings.tabName)
    localStorage.setItem("cloakedTabIcon", settings.tabIcon)
    localStorage.setItem("cloakOverlayEnabled", settings.enabled.toString())
  if (settings.overlayName) localStorage.setItem("cloakOverlayName", settings.overlayName)
  if (settings.fillMode) localStorage.setItem("cloakOverlayFillMode", settings.fillMode)
  }

  // Load settings from localStorage
  const loadSettings = (): CloakSettings => {
    try {
      const saved = localStorage.getItem("cloakSettings")
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.warn("Failed to load cloak settings:", error)
    }

    // Fallback to individual items for backwards compatibility
    const enabled = localStorage.getItem("cloakOverlayEnabled") === "true"
    const tabName = localStorage.getItem("cloakedTabName") || "KittenGames"
    const tabIcon = localStorage.getItem("cloakedTabIcon") || "/favicon.ico"
    const presetName = localStorage.getItem("cloakedPresetName") || ""
    const overlayName = localStorage.getItem("cloakOverlayName") || ""
  const savedFillMode = (localStorage.getItem("cloakOverlayFillMode") as CloakSettings['fillMode']) || 'contain'

    return {
      enabled,
      tabName,
      tabIcon,
      pageContent: "📘 Study Notes",
      backgroundColor: "#ffffff",
      textColor: "#333333",
      presetName,
      overlayType: 'html',
      overlayHtml: "<div style=\"text-align:center\"><h1>📘 Study Notes</h1><p>Welcome back!</p></div>",
      overlayImage: "",
      overlayName,
  fillMode: savedFillMode,
    }
  }

  // Update settings and sync across tabs
  const updateSettings = (newSettings: Partial<CloakSettings>) => {
    const updatedSettings = { ...cloakSettings, ...newSettings }
    setCloakSettings(updatedSettings)
    saveSettings(updatedSettings)
    broadcastSettings(updatedSettings)

    // Apply cloak immediately if not in overlay mode
    if (!updatedSettings.enabled) {
      applyCloakToTab(updatedSettings)
    } else {
      // If switching to overlay mode, restore original tab
      restoreOriginalTab()
    }
  }

  useEffect(() => {
    // Store original tab info
    setOriginalTitle(document.title)
    const favicon = document.querySelector('link[rel="icon"]')?.getAttribute('href') || "/favicon.ico"
    setOriginalIcon(favicon)

    // Initialize BroadcastChannel for cross-tab communication
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('cloak-sync')
      setBroadcastChannel(channel)

      // Listen for messages from other tabs
      channel.onmessage = (event: MessageEvent<CloakMessage>) => {
        if (event.data.type === 'CLOAK_UPDATE') {
          setCloakSettings(event.data.settings)
          
          // Apply the cloak to this tab
          if (!event.data.settings.enabled) {
            applyCloakToTab(event.data.settings)
          } else {
            restoreOriginalTab()
          }
        }
      }

      return () => {
        channel.close()
      }
    }
  }, [])

  useEffect(() => {
    // Load initial settings
    const initialSettings = loadSettings()
    setCloakSettings(initialSettings)

    // Apply initial cloak if not in overlay mode
    if (!initialSettings.enabled && initialSettings.tabName) {
      applyCloakToTab(initialSettings)
    }

    // Listen for localStorage changes (for cross-tab sync in browsers without BroadcastChannel)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cloakSettings' && e.newValue) {
        try {
          const newSettings = JSON.parse(e.newValue)
          setCloakSettings(newSettings)
          
          if (!newSettings.enabled) {
            applyCloakToTab(newSettings)
          } else {
            restoreOriginalTab()
          }
        } catch (error) {
          console.warn("Failed to parse cloak settings from storage event:", error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  useEffect(() => {
    // Listen for settings changes from components
    const handleSettingsChange = (event: CustomEvent) => {
      updateSettings({
        enabled: event.detail.enabled,
        tabName: event.detail.tabName,
        tabIcon: event.detail.tabIcon,
  pageContent: event.detail.pageContent,
  backgroundColor: event.detail.backgroundColor,
  textColor: event.detail.textColor,
  presetName: event.detail.presetName || "",
  overlayType: event.detail.overlayType || 'html',
  overlayHtml: event.detail.overlayHtml,
  overlayImage: event.detail.overlayImage,
  overlayName: event.detail.overlayName,
  fillMode: event.detail.fillMode,
      })
    }

    window.addEventListener('cloakSettingsChanged', handleSettingsChange as EventListener)

    return () => {
      window.removeEventListener('cloakSettingsChanged', handleSettingsChange as EventListener)
    }
  }, [cloakSettings])

  // Expose cloak control functions globally for debugging/external use
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).cloakManager = {
        getSettings: () => cloakSettings,
        updateSettings,
        applyCloakToTab,
        restoreOriginalTab,
        broadcastSettings: () => broadcastSettings(cloakSettings)
      }
    }
  }, [cloakSettings])

  return (
    <CloakOverlay
      isEnabled={cloakSettings.enabled}
      overlayContent={{
        title: cloakSettings.tabName,
        favicon: cloakSettings.tabIcon,
  type: cloakSettings.overlayType,
  html: cloakSettings.overlayHtml || cloakSettings.pageContent,
  image: cloakSettings.overlayImage,
  backgroundColor: cloakSettings.backgroundColor,
  textColor: cloakSettings.textColor,
  fillMode: cloakSettings.fillMode,
      }}
    />
  )
}
