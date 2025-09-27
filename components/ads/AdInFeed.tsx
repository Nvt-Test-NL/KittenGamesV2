"use client"

import { useEffect } from "react"

interface AdInFeedProps {
  adSlot: string
  adClient?: string
  layoutKey?: string
  className?: string
}

export default function AdInFeed({
  adSlot,
  adClient = "ca-pub-4865118146627791",
  layoutKey = "-6t+ed+2i-1n-4w",
  className = "",
}: AdInFeedProps) {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {}
  }, [])

  return (
    <div className={`rounded-2xl bg-gradient-to-br from-gray-800/60 to-gray-900/60 border border-gray-700/40 p-0 overflow-hidden ${className}`}>
      <div className="p-3 text-xs uppercase tracking-wide text-gray-400">Ad</div>
      <ins
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-format="fluid"
        data-ad-layout-key={layoutKey}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-full-width-responsive="true"
      />
    </div>
  )
}
