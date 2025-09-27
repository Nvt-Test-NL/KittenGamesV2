"use client"

import { useState, useEffect } from "react"
import { X, ChevronDown, Check, Eye, EyeOff } from "lucide-react"
import Image from "next/image"
import type React from "react"

interface TabCustomizationPopupProps {
  isOpen: boolean
  onClose: () => void
}

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

export default function TabCustomizationPopup({ isOpen, onClose }: TabCustomizationPopupProps) {
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

  // Load presets from local /public JSON
  useEffect(() => {
    const fetchPresets = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/presets.json")
        if (!response.ok) {
          throw new Error("Failed to fetch presets")
        }
        const data = await response.json()
        
        // Ensure Custom option is always available
        const presetsWithCustom = [...data]
        if (!presetsWithCustom.find(preset => preset.name === "Custom")) {
          presetsWithCustom.push({ name: "Custom", tabName: "", tabIcon: "" })
        }
        
        setPresets(presetsWithCustom)
        // Removed setSelectedPreset, setTabName, setTabIcon from here
      } catch (error) {
        console.error("Error loading presets:", error)
        // Fallback to ensure at least Custom option is available
        const fallbackPresets = [
          {
            name: "Google Drive",
            tabName: "My Drive - Google Drive",
            tabIcon: "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png",
          },
          { name: "Custom", tabName: "", tabIcon: "" }
        ]
        setPresets(fallbackPresets)
        // Removed setSelectedPreset, setTabName, setTabIcon from here
      } finally {
        setIsLoading(false)
      }
    }

    if (isOpen) {
      fetchPresets()
    }
  }, [isOpen]) // Dependency array changed to [isOpen]

  // Load overlays when popup opens and overlay is enabled
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

    if (isOpen && overlayEnabled && overlays.length === 0 && !overlayLoading) {
      loadOverlays()
    }
  }, [isOpen, overlayEnabled, overlays.length, overlayLoading])

  useEffect(() => {
    if (isOpen && !isLoading && presets.length > 0) { // Ensure presets are loaded
      const savedPresetName = localStorage.getItem("cloakedPresetName")
      const savedTabName = localStorage.getItem("cloakedTabName")
      const savedTabIcon = localStorage.getItem("cloakedTabIcon")
      const savedOverlayEnabled = localStorage.getItem("cloakOverlayEnabled") === "true"

      setOverlayEnabled(savedOverlayEnabled)

      let initialPreset = presets[0]; // Default to the first preset

      if (savedPresetName) {
        const foundPreset = presets.find((preset) => preset.name === savedPresetName)
        if (foundPreset) {
          initialPreset = foundPreset;
        }
      } else if (savedTabName && savedTabIcon) { // If no preset name, but custom values exist, default to Custom
        const customPreset = presets.find(preset => preset.name === "Custom")
        if (customPreset) {
          initialPreset = customPreset;
        }
      }
      
      setSelectedPreset(initialPreset);
      if (initialPreset.name === "Custom") {
        setTabName(savedTabName || initialPreset.tabName || "")
        setTabIcon(savedTabIcon || initialPreset.tabIcon || "")
      } else {
        setTabName(initialPreset.tabName)
        setTabIcon(initialPreset.tabIcon)
      }
    }
  }, [isOpen, isLoading, presets])

  const handlePresetChange = (preset: CloakPreset) => {
    setSelectedPreset(preset)
    if (preset.name !== "Custom") {
      setTabName(preset.tabName)
      setTabIcon(preset.tabIcon)
    } else {
      // Optionally, clear custom fields or load saved custom values
      const savedTabName = localStorage.getItem("cloakedTabName")
      const savedTabIcon = localStorage.getItem("cloakedTabIcon")
      const lastSelectedPreset = localStorage.getItem("cloakedPresetName")
      if (lastSelectedPreset === "Custom") {
        setTabName(savedTabName || "")
        setTabIcon(savedTabIcon || "")
      } else {
        setTabName("") // Clear for new custom entry
        setTabIcon("")
      }
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
  // Backward compatible fields derived from overlay
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
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-150">
      <div className="bg-gray-900 rounded-xl p-6 w-96 shadow-xl border border-gray-700/80">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-semibold text-gray-100">
            Customize Tab Appearance
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-200 transition-colors p-1 rounded-md hover:bg-gray-700/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {isLoading ? (
          <div className="text-center py-8 text-gray-300 flex flex-col items-center">
            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-2"></div>
            <span>Loading presets...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Preset selector */}
            <div>
              <label htmlFor="preset" className="block text-xs font-medium text-gray-400 mb-1.5">
                Preset
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full px-3.5 py-2.5 bg-gray-800 text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 border border-gray-700 transition-colors flex justify-between items-center hover:bg-gray-700/70"
                >
                  <div className="flex items-center space-x-2.5">
                    {selectedPreset && selectedPreset.tabIcon && selectedPreset.name !== "Custom" ? (
                      <div className="flex-shrink-0 w-4 h-4 relative">
                        <Image
                          src={selectedPreset.tabIcon}
                          alt={selectedPreset.name}
                          layout="fill"
                          objectFit="contain"
                          className="rounded-sm"
                        />
                      </div>
                    ) : selectedPreset?.name === "Custom" ? (
                      <div className="w-4 h-4 bg-purple-600 rounded-md flex items-center justify-center">
                        <span className="text-xs font-bold text-white">C</span>
                      </div>
                    ) : <div className="w-4 h-4 bg-gray-700 rounded-sm"></div>}
                    <span className="text-sm">{selectedPreset?.name || "Select a preset"}</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 text-gray-400 ${isDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-800 rounded-lg shadow-lg max-h-56 overflow-y-auto border border-gray-700 animate-in fade-in slide-in-from-top-1 duration-100">
                    {presets.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => handlePresetChange(preset)}
                        className="w-full px-3.5 py-2.5 text-left text-gray-200 hover:bg-gray-700/70 transition-colors flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center space-x-2.5">
                          {preset.tabIcon && preset.name !== "Custom" ? (
                            <div className="flex-shrink-0 w-4 h-4 relative">
                              <Image
                                src={preset.tabIcon}
                                alt={preset.name}
                                layout="fill"
                                objectFit="contain"
                                className="rounded-sm"
                              />
                            </div>
                          ) : preset.name === "Custom" ? (
                            <div className="w-4 h-4 bg-purple-600 rounded-md flex items-center justify-center">
                              <span className="text-xs font-bold text-white">C</span>
                            </div>
                          ) : <div className="w-4 h-4 bg-gray-700 rounded-sm"></div>}
                          <span>{preset.name}</span>
                        </div>
                        {selectedPreset?.name === preset.name && (
                          <Check className="w-3.5 h-3.5 text-purple-500" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tab Overlay Toggle and overlay selector */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Tab Overlay
              </label>
              <button
                type="button"
                onClick={() => setOverlayEnabled(!overlayEnabled)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border transition-colors ${
                  overlayEnabled
                    ? "bg-purple-600 border-purple-500 text-white"
                    : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700/70"
                }`}
              >
                <div className="flex items-center space-x-2">
                  {overlayEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  <span className="text-sm">{overlayEnabled ? "Enabled" : "Disabled"}</span>
                </div>
              </button>
              <p className="text-gray-500 text-xs mt-1">
                {overlayEnabled 
                  ? "Show overlay when cursor leaves the page" 
                  : "Use regular tab cloaking"
                }
              </p>
              {overlayEnabled && (
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Overlay</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsOverlayDropdownOpen(!isOverlayDropdownOpen)}
                      className="w-full px-3.5 py-2.5 bg-gray-800 text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 border border-gray-700 transition-colors flex justify-between items-center hover:bg-gray-700/70"
                      disabled={overlayLoading}
                    >
                      <span className="text-sm">{overlayLoading ? 'Loading overlays…' : (selectedOverlay?.name || 'Select overlay')}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 text-gray-400 ${isOverlayDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOverlayDropdownOpen && !overlayLoading && (
                      <div className="absolute z-10 w-full mt-1 bg-gray-800 rounded-lg shadow-lg max-h-56 overflow-y-auto border border-gray-700 animate-in fade-in slide-in-from-top-1 duration-100">
                        {overlays.map((ov) => (
                          <button
                            key={ov.name}
                            type="button"
                            onClick={() => { setSelectedOverlay(ov); setFillMode(ov.fillMode || 'contain'); setIsOverlayDropdownOpen(false) }}
                            className="w-full px-3.5 py-2.5 text-left text-gray-200 hover:bg-gray-700/70 transition-colors flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center space-x-2.5">
                              <span>{ov.name}</span>
                              <span className="text-xs text-gray-400">{ov.type}{ov.type === 'image' && ov.fillMode ? ` • ${ov.fillMode}` : ''}</span>
                            </div>
                            {selectedOverlay?.name === ov.name && (
                              <Check className="w-3.5 h-3.5 text-purple-500" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedOverlay?.type === 'image' && (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Fill mode</label>
                      <select
                        value={fillMode}
                        onChange={(e) => setFillMode(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 bg-gray-800 text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 border border-gray-700 transition-colors"
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

            {/* Custom fields for Custom preset */}
            {selectedPreset?.name === "Custom" && (
              <>
                <div>
                  <label htmlFor="tabName" className="block text-xs font-medium text-gray-400 mb-1.5">
                    Tab Name
                  </label>
                  <input
                    type="text"
                    id="tabName"
                    value={tabName}
                    onChange={(e) => setTabName(e.target.value)}
                    placeholder="Enter custom tab name"
                    className="w-full px-3.5 py-2.5 bg-gray-800 text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 border border-gray-700 transition-colors placeholder-gray-500 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="tabIcon" className="block text-xs font-medium text-gray-400 mb-1.5">
                    Tab Icon URL
                  </label>
                  <input
                    type="url"
                    id="tabIcon"
                    value={tabIcon}
                    onChange={(e) => setTabIcon(e.target.value)}
                    placeholder="https://example.com/icon.png"
                    className="w-full px-3.5 py-2.5 bg-gray-800 text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 border border-gray-700 transition-colors placeholder-gray-500 text-sm"
                  />
                </div>
              </>
            )}

            {/* Preview */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Preview</label>
              <div className="bg-gray-800/70 rounded-lg border border-gray-700">
                <div className="flex items-center space-x-2 bg-gray-700/50 px-3 py-2">
                  {tabIcon ? (
                    <div className="flex-shrink-0 w-3.5 h-3.5 relative">
                      <Image
                        src={tabIcon}
                        alt="Tab Icon Preview"
                        layout="fill"
                        objectFit="contain"
                        className="rounded-sm"
                      />
                    </div>
                  ) : (
                    <div className="w-3.5 h-3.5 bg-gray-600 rounded-sm"></div>
                  )}
                  <span className="text-xs text-gray-300 truncate flex-grow">
                    {tabName || "Tab Title"}
                  </span>
                </div>
                <div className="bg-gray-800/70 h-20 flex items-center justify-center p-3">
                  <div className="text-gray-500 text-xs text-center">
                    <p>Website Content</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-purple-600 text-white py-2.5 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 text-sm"
            >
              Apply Changes
            </button>
          </form>
        )}
      </div>
    </div>
  )
}