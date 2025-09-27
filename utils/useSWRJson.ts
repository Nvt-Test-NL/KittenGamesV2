"use client"

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error(`Failed to fetch ${url}`)
  return r.json()
})

export function useSWRJson<T = any>(url: string | null) {
  return useSWR<T>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
    revalidateIfStale: true,
  })
}