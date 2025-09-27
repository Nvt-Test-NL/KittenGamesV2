import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const BASE_DIR = path.join(process.cwd(), 'KittenGames-gamelibrary-main')

export async function GET() {
  try {
    const p = path.join(BASE_DIR, 'popup.json')
    const raw = await fs.readFile(p, 'utf-8')
    const data = JSON.parse(raw)
    return NextResponse.json(data, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Unable to read popup.json', detail: String(e) }, { status: 500 })
  }
}
