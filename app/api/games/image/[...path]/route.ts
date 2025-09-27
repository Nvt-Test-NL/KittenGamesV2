import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const BASE_DIR = path.join(process.cwd(), 'KittenGames-gamelibrary-main', 'images')

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const rel = params.path.join('/')
    const safeRel = rel.replace(/\.\./g, '')
    const filePath = path.join(BASE_DIR, safeRel)
    const data = await fs.readFile(filePath)

    const ext = path.extname(filePath).toLowerCase()
    const type = ext === '.png' ? 'image/png'
      : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
      : ext === '.webp' ? 'image/webp'
      : 'application/octet-stream'

    return new NextResponse(data, { status: 200, headers: { 'Content-Type': type } })
  } catch (e: any) {
    return NextResponse.json({ error: 'Image not found', detail: String(e) }, { status: 404 })
  }
}
