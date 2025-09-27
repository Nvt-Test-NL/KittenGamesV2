"use client"

import { useState, useEffect, useCallback } from "react"
import DOMPurify from "dompurify"

interface CloakOverlayProps {
  isEnabled: boolean
  overlayContent: {
    title: string
    favicon: string
    type?: 'html' | 'image'
    html?: string
    image?: string
    backgroundColor?: string
    textColor?: string
  fillMode?: 'contain' | 'cover' | 'fill' | 'scale-down' | 'none'
  }
}

export default function CloakOverlay({ isEnabled, overlayContent }: CloakOverlayProps) {
  const [showOverlay, setShowOverlay] = useState(false)
  const [visibilityChannel, setVisibilityChannel] = useState<BroadcastChannel | null>(null)

  const handleMouseOut = useCallback((e: MouseEvent) => {
    // Show overlay when cursor leaves window (like the provided HTML example)
    if (!e.relatedTarget && !(e as any).toElement) {
      if (isEnabled) {
        setShowOverlay(true)

        // Apply tab cloaking
        document.title = overlayContent.title
        const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null
        if (favicon) {
          favicon.href = overlayContent.favicon
        } else {
          const newFavicon = document.createElement("link")
          newFavicon.rel = "icon"
          newFavicon.href = overlayContent.favicon
          document.head.appendChild(newFavicon)
        }

        // Broadcast visibility change
        try {
          localStorage.setItem('cloakOverlayVisible', 'true')
        } catch {}
        if (visibilityChannel) {
          visibilityChannel.postMessage({ type: 'OVERLAY_VISIBILITY', visible: true })
        }
      }
    }
  }, [isEnabled, overlayContent, visibilityChannel])

  const handleClick = useCallback(() => {
    // Hide overlay on click
    if (showOverlay) {
      setShowOverlay(false)

      // Restore original tab title and favicon
      const originalTitle = localStorage.getItem("originalTabTitle") || document.title
      const originalFavicon = localStorage.getItem("originalTabFavicon") || "/favicon.ico"

      document.title = originalTitle
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null
      if (favicon) {
        favicon.href = originalFavicon
      }

      // Broadcast visibility change
      try {
        localStorage.setItem('cloakOverlayVisible', 'false')
      } catch {}
      if (visibilityChannel) {
        visibilityChannel.postMessage({ type: 'OVERLAY_VISIBILITY', visible: false })
      }
    }
  }, [showOverlay, visibilityChannel])

  useEffect(() => {
    // Store original title and favicon once
    const originalTitle = document.title
    const originalFavicon = document.querySelector('link[rel="icon"]')?.getAttribute('href') || "/favicon.ico"

    localStorage.setItem("originalTabTitle", originalTitle)
    localStorage.setItem("originalTabFavicon", originalFavicon)

    if (isEnabled) {
      document.body.addEventListener("mouseout", handleMouseOut)
      document.addEventListener("click", handleClick)
    }

    return () => {
      document.body.removeEventListener("mouseout", handleMouseOut)
      document.removeEventListener("click", handleClick)
    }
  }, [isEnabled, handleMouseOut, handleClick])

  // Setup BroadcastChannel and storage sync for overlay visibility
  useEffect(() => {
    let channel: BroadcastChannel | null = null
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('cloak-overlay-visibility')
      setVisibilityChannel(channel)
      channel.onmessage = (event: MessageEvent<{ type: string; visible: boolean }>) => {
        if (event.data?.type === 'OVERLAY_VISIBILITY') {
          if (event.data.visible) {
            if (isEnabled) {
              setShowOverlay(true)
              // Apply tab cloaking to this tab too
              document.title = overlayContent.title
              const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null
              if (favicon) {
                favicon.href = overlayContent.favicon
              } else {
                const newFavicon = document.createElement("link")
                newFavicon.rel = "icon"
                newFavicon.href = overlayContent.favicon
                document.head.appendChild(newFavicon)
              }
            }
          } else {
            setShowOverlay(false)
            // Restore original for this tab
            const originalTitle = localStorage.getItem("originalTabTitle") || document.title
            const originalFavicon = localStorage.getItem("originalTabFavicon") || "/favicon.ico"
            document.title = originalTitle
            const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null
            if (favicon) {
              favicon.href = originalFavicon
            }
          }
        }
      }
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'cloakOverlayVisible' && e.newValue != null) {
        const visible = e.newValue === 'true'
        if (visible) {
          if (isEnabled) {
            setShowOverlay(true)
            document.title = overlayContent.title
            const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null
            if (favicon) {
              favicon.href = overlayContent.favicon
            } else {
              const newFavicon = document.createElement("link")
              newFavicon.rel = "icon"
              newFavicon.href = overlayContent.favicon
              document.head.appendChild(newFavicon)
            }
          }
        } else {
          setShowOverlay(false)
          const originalTitle = localStorage.getItem("originalTabTitle") || document.title
          const originalFavicon = localStorage.getItem("originalTabFavicon") || "/favicon.ico"
          document.title = originalTitle
          const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null
          if (favicon) {
            favicon.href = originalFavicon
          }
        }
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
      if (channel) channel.close()
    }
  }, [isEnabled, overlayContent])

  if (!showOverlay) return null

  return (
    <div
      className="fixed inset-0 z-[9999]"
      style={{
        backgroundColor: overlayContent.backgroundColor || '#ffffff',
        color: overlayContent.textColor || '#333333',
        visibility: showOverlay ? "visible" : "hidden",
      }}
    >
      {overlayContent.type === 'image' && overlayContent.image ? (
        <img
          src={overlayContent.image}
          alt={overlayContent.title || 'Overlay'}
          className={`w-full h-full ${
            overlayContent.fillMode === 'cover' ? 'object-cover' :
            overlayContent.fillMode === 'fill' ? 'object-fill' :
            overlayContent.fillMode === 'scale-down' ? 'object-scale-down' :
            overlayContent.fillMode === 'none' ? 'object-none' : 'object-contain'
          }`}
          loading="eager"
        />
      ) : (
        <div
          className="w-full h-full overflow-auto p-6"
          dangerouslySetInnerHTML={{ __html: overlayContent.html ? DOMPurify.sanitize(overlayContent.html) : '' }}
        />
      )}
    </div>
  )
}
