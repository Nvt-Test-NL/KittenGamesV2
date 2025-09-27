"use client"

import { useState, useEffect } from "react"
import { ChevronDown, Check, Eye, EyeOff } from "lucide-react"
import Image from "next/image"

interface CloakPreset {
  name: string
  tabName: string
  tabIcon: string
}

interface OverlayPreset {
  name: string
  type: 'html' | 'image'
  backgroundColor?: string
  textColor?: string
  html?: string
  image?: string
  fillMode?: 'contain' | 'cover' | 'fill' | 'scale-down' | 'none'
}

export default function CloakSettingsPanel() {
  const [presets, setPresets] = useState<CloakPreset[]>([
    {
      name: "Google Drive",
      tabName: "My Drive - Google Drive",
      tabIcon: "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png",
    },
  ])
  const [selectedPreset, setSelectedPreset] = useState<CloakPreset | null>(null)
  const [tabName, setTabName] = useState("")
  const [tabIcon, setTabIcon] = useState("")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [overlayEnabled, setOverlayEnabled] = useState(false)
  const [overlays, setOverlays] = useState<OverlayPreset[]>([])
  const [overlayLoading, setOverlayLoading] = useState(false)
  const [selectedOverlay, setSelectedOverlay] = useState<OverlayPreset | null>(null)
  const [isOverlayDropdownOpen, setIsOverlayDropdownOpen] = useState(false)
  const [fillMode, setFillMode] = useState<'contain' | 'cover' | 'fill' | 'scale-down' | 'none'>('contain')

  useEffect(() => {
    const fetchPresets = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/presets.json")
        if (!response.ok) throw new Error("Failed to fetch presets")
        const data = await response.json()
        const presetsWithCustom = [...data]
        if (!presetsWithCustom.find(preset => preset.name === "Custom")) {
          presetsWithCustom.push({ 
            name: "Custom", 
            tabName: "", 
            tabIcon: ""
          })
        }
        setPresets(presetsWithCustom)
        if (presetsWithCustom.length > 0 && !selectedPreset) {
          setSelectedPreset(presetsWithCustom[0])
          setTabName(presetsWithCustom[0].tabName)
          setTabIcon(presetsWithCustom[0].tabIcon)
        }
      } catch (error) {
        const fallbackPresets = [
          {
            name: "Google Drive",
            tabName: "My Drive - Google Drive",
            tabIcon: "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png",
          },
          { 
            name: "Custom", 
            tabName: "", 
            tabIcon: ""
          }
        ]
        setPresets(fallbackPresets)
        if (!selectedPreset) {
          setSelectedPreset(fallbackPresets[0])
          setTabName(fallbackPresets[0].tabName)
          setTabIcon(fallbackPresets[0].tabIcon)
        }
      } finally {
        setIsLoading(false)
      }
    }
    fetchPresets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!isLoading && selectedPreset) {
      const savedPresetName = localStorage.getItem("cloakedPresetName")
      const savedTabName = localStorage.getItem("cloakedTabName")
      const savedTabIcon = localStorage.getItem("cloakedTabIcon")
      const savedOverlayEnabled = localStorage.getItem("cloakOverlayEnabled") === "true"
      const savedOverlayName = localStorage.getItem("cloakOverlayName") || ""
      
      setOverlayEnabled(savedOverlayEnabled)
      
      if (savedPresetName) {
        const foundPreset = presets.find((preset) => preset.name === savedPresetName)
        if (foundPreset) {
          setSelectedPreset(foundPreset)
          if (foundPreset.name === "Custom") {
            setTabName(savedTabName || "")
            setTabIcon(savedTabIcon || "")
          } else {
            setTabName(foundPreset.tabName)
            setTabIcon(foundPreset.tabIcon)
          }
        }
      } else if (savedTabName && savedTabIcon) {
        const customPreset = presets.find(preset => preset.name === "Custom")
        if (customPreset) {
          setSelectedPreset(customPreset)
          setTabName(savedTabName)
          setTabIcon(savedTabIcon)
        }
      }

      // Preselect overlay if overlays are already loaded
      if (overlays.length > 0) {
        const foundOverlay = overlays.find(o => o.name === savedOverlayName)
  const ov = foundOverlay || overlays[0]
  setSelectedOverlay(ov)
  setFillMode(ov?.fillMode || 'contain')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, presets, overlays])

  // Load overlay presets when overlay gets enabled
  useEffect(() => {
    const loadOverlays = async () => {
      try {
        setOverlayLoading(true)
        const res = await fetch('/overlays.json')
        if (!res.ok) throw new Error('Failed to fetch overlays')
        const data: OverlayPreset[] = await res.json()
        setOverlays(data)
        const savedOverlayName = localStorage.getItem('cloakOverlayName') || ''
        const found = data.find(o => o.name === savedOverlayName)
  const ov = found || data[0] || null
  setSelectedOverlay(ov)
  setFillMode(ov?.fillMode || 'contain')
      } catch (e) {
        const fallback: OverlayPreset = {
          name: 'Study Notes (HTML)',
          type: 'html',
          backgroundColor: '#ffffff',
          textColor: '#333333',
          html: '<div style="text-align:center"><h1>📘 Study Notes</h1><p>Welcome back!</p></div>'
        }
  setOverlays([fallback])
  setSelectedOverlay(fallback)
  setFillMode(fallback.fillMode || 'contain')
      } finally {
        setOverlayLoading(false)
      }
    }

    if (overlayEnabled && overlays.length === 0 && !overlayLoading) {
      loadOverlays()
    }
  }, [overlayEnabled, overlays.length, overlayLoading])

  const handlePresetChange = (preset: CloakPreset) => {
    setSelectedPreset(preset)
    if (preset.name !== "Custom") {
      setTabName(preset.tabName)
      setTabIcon(preset.tabIcon)
    }
    setIsDropdownOpen(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPreset) return
    const newTabName = selectedPreset.name === "Custom" ? tabName : selectedPreset.tabName
    const newTabIcon = selectedPreset.name === "Custom" ? tabIcon : selectedPreset.tabIcon

    // Persist overlay selection defaults
    try {
      if (selectedOverlay?.name) localStorage.setItem('cloakOverlayName', selectedOverlay.name)
      if (fillMode) localStorage.setItem('cloakOverlayFillMode', fillMode)
    } catch {}

    // Trigger a custom event to notify the CloakManager
    window.dispatchEvent(new CustomEvent('cloakSettingsChanged', {
      detail: {
        enabled: overlayEnabled,
        tabName: newTabName,
        tabIcon: newTabIcon,
        // Backward compatible fields from overlay
        pageContent: selectedOverlay?.type === 'html' ? (selectedOverlay?.html || '') : '',
  backgroundColor: selectedOverlay?.backgroundColor || '#ffffff',
  textColor: selectedOverlay?.textColor || '#333333',
        presetName: selectedPreset.name,
        // New overlay fields
  overlayType: selectedOverlay?.type || 'html',
        overlayHtml: selectedOverlay?.type === 'html' ? (selectedOverlay?.html || '') : undefined,
        overlayImage: selectedOverlay?.type === 'image' ? (selectedOverlay?.image || '') : undefined,
  overlayName: selectedOverlay?.name,
  fillMode,
      }
    }))

    // Show feedback to user
    const button = e.target as HTMLFormElement
    const submitButton = button.querySelector('button[type="submit"]') as HTMLButtonElement
    if (submitButton) {
      const originalText = submitButton.textContent
      submitButton.textContent = "Applied!"
      submitButton.disabled = true
      setTimeout(() => {
        submitButton.textContent = originalText
        submitButton.disabled = false
      }, 2000)
    }
  }

  return (
    <section className="border-b border-gray-800 pb-8 mb-8">
      <h3 className="text-xl font-semibold mb-2 text-white">Tab Cloaking</h3>
      <p className="text-gray-400 mb-6 text-sm">
        Change how this tab appears in your browser. Choose a preset or customize the tab name and icon.
      </p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="preset" className="block text-sm font-medium text-gray-300 mb-2">
            Preset
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full px-4 py-2 bg-gray-900 text-gray-100 rounded-md border border-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 flex justify-between items-center hover:bg-gray-800 transition"
            >
              <div className="flex items-center space-x-3">
                {selectedPreset?.tabIcon && selectedPreset.name !== "Custom" ? (
                  <div className="flex-shrink-0 w-5 h-5 relative">
                    <Image
                      src={selectedPreset.tabIcon}
                      alt={selectedPreset.name}
                      layout="fill"
                      objectFit="contain"
                      className="rounded-sm"
                    />
                  </div>
                ) : selectedPreset?.name === "Custom" ? (
                  <div className="w-5 h-5 bg-purple-600 rounded flex items-center justify-center">
                    <span className="text-xs text-white">C</span>
                  </div>
                ) : null}
                <span>{selectedPreset?.name || "Select a preset"}</span>
              </div>
              <ChevronDown
                className={`w-5 h-5 transition-transform duration-300 text-purple-400 ${isDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-gray-900 rounded-md shadow-lg max-h-60 overflow-y-auto border border-gray-800 animate-in fade-in slide-in-from-top-2 duration-150">
                {presets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handlePresetChange(preset)}
                    className="w-full px-4 py-2 text-left text-gray-100 hover:bg-gray-800 transition flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      {preset.tabIcon && preset.name !== "Custom" ? (
                        <div className="flex-shrink-0 w-5 h-5 relative">
                          <Image
                            src={preset.tabIcon}
                            alt={preset.name}
                            layout="fill"
                            objectFit="contain"
                            className="rounded-sm"
                          />
                        </div>
                      ) : preset.name === "Custom" ? (
                        <div className="w-5 h-5 bg-purple-600 rounded flex items-center justify-center">
                          <span className="text-xs text-white">C</span>
                        </div>
                      ) : null}
                      <span>{preset.name}</span>
                    </div>
                    {selectedPreset?.name === preset.name && (
                      <Check className="w-4 h-4 text-purple-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Tab Overlay Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Tab Overlay
          </label>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setOverlayEnabled(!overlayEnabled)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md border transition-colors ${
                overlayEnabled
                  ? "bg-purple-600 border-purple-500 text-white"
                  : "bg-gray-900 border-gray-800 text-gray-300 hover:bg-gray-800"
              }`}
            >
              {overlayEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span>{overlayEnabled ? "Enabled" : "Disabled"}</span>
            </button>
          </div>
          <p className="text-gray-500 text-xs mt-1">
            {overlayEnabled 
              ? "Show overlay when cursor leaves the page" 
              : "Use regular tab cloaking"
            }
          </p>
          {overlayEnabled && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-300 mb-2">Overlay</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsOverlayDropdownOpen(!isOverlayDropdownOpen)}
                  className="w-full px-4 py-2 bg-gray-900 text-gray-100 rounded-md border border-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 flex justify-between items-center hover:bg-gray-800 transition"
                  disabled={overlayLoading}
                >
                  <span>{overlayLoading ? 'Loading overlays…' : (selectedOverlay?.name || 'Select overlay')}</span>
                  <ChevronDown className={`w-5 h-5 transition-transform duration-300 text-purple-400 ${isOverlayDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOverlayDropdownOpen && !overlayLoading && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-900 rounded-md shadow-lg max-h-60 overflow-y-auto border border-gray-800 animate-in fade-in slide-in-from-top-2 duration-150">
                    {overlays.map((ov) => (
                      <button
                        key={ov.name}
                        type="button"
                        onClick={() => { setSelectedOverlay(ov); setFillMode(ov.fillMode || 'contain'); setIsOverlayDropdownOpen(false) }}
                        className="w-full px-4 py-2 text-left text-gray-100 hover:bg-gray-800 transition flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-sm">{ov.name}</span>
                          <span className="text-xs text-gray-400">{ov.type}{ov.type === 'image' && ov.fillMode ? ` • ${ov.fillMode}` : ''}</span>
                        </div>
                        {selectedOverlay?.name === ov.name && (
                          <Check className="w-4 h-4 text-purple-400" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedOverlay?.type === 'image' && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Fill mode</label>
                  <select
                    value={fillMode}
                    onChange={(e) => setFillMode(e.target.value as any)}
                    className="w-full px-4 py-2 bg-gray-900 text-gray-100 rounded-md border border-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 hover:bg-gray-800 transition"
                  >
                    <option value="contain">contain</option>
                    <option value="cover">cover</option>
                    <option value="fill">fill</option>
                    <option value="scale-down">scale-down</option>
                    <option value="none">none</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
        
        {selectedPreset?.name === "Custom" && (
          <>
            <div>
              <label htmlFor="tabName" className="block text-sm font-medium text-gray-300 mb-2">
                Tab Name
              </label>
              <input
                type="text"
                id="tabName"
                value={tabName}
                onChange={(e) => setTabName(e.target.value)}
                placeholder="Enter custom tab name"
                className="w-full px-4 py-2 bg-gray-900 text-gray-100 rounded-md border border-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500"
              />
            </div>
            <div>
              <label htmlFor="tabIcon" className="block text-sm font-medium text-gray-300 mb-2">
                Tab Icon URL
              </label>
              <input
                type="url"
                id="tabIcon"
                value={tabIcon}
                onChange={(e) => setTabIcon(e.target.value)}
                placeholder="https://example.com/icon.png"
                className="w-full px-4 py-2 bg-gray-900 text-gray-100 rounded-md border border-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500"
              />
            </div>
          </>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Preview</label>
          <div className="bg-gray-900 rounded-md border border-gray-800">
            <div className="flex items-center space-x-3 bg-gray-950 px-4 py-2">
              {tabIcon ? (
                <div className="flex-shrink-0 w-4 h-4 relative">
                  <Image
                    src={tabIcon}
                    alt="Tab Icon"
                    layout="fill"
                    objectFit="contain"
                    className="rounded-sm"
                  />
                </div>
              ) : (
                <div className="w-4 h-4 bg-gray-700 rounded-sm"></div>
              )}
              <span className="text-sm text-white truncate flex-grow">
                {tabName || "Tab Title"}
              </span>
            </div>
            <div className="bg-gray-900 h-20 flex items-center justify-center p-4">
              <div className="text-gray-400 text-xs text-center">
                <p>Website Content</p>
                <p className="mt-1 text-gray-500">The tab will appear like this in your browser</p>
              </div>
            </div>
          </div>
        </div>
        <button
          type="submit"
          className="w-fit bg-purple-600 hover:bg-purple-700 text-white py-2 px-6 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition"
        >
          Apply Changes
        </button>
      </form>
    </section>
  )
}
