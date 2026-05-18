import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: folders, error } = await supabase
    .from('folders')
    .select('id, name, color, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get translation counts per folder
  const folderIds = (folders ?? []).map(f => f.id)
  let counts: Record<string, number> = {}

  if (folderIds.length > 0) {
    const { data: countData } = await supabase
      .from('translations')
      .select('folder_id')
      .eq('user_id', user.id)
      .in('folder_id', folderIds)

    for (const row of countData ?? []) {
      if (row.folder_id) {
        counts[row.folder_id] = (counts[row.folder_id] ?? 0) + 1
      }
    }
  }

  const result = (folders ?? []).map(f => ({
    ...f,
    translation_count: counts[f.id] ?? 0,
  }))

  return NextResponse.json({ folders: result })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name, color } = body as { name: string; color?: string }

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 })
  }

  const service = await createServiceClient()
  const { data: folder, error } = await service
    .from('folders')
    .insert({ user_id: user.id, name: name.trim(), color: color ?? '#ef4444' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ folder }, { status: 201 })
}
