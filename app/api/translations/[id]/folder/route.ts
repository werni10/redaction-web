import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { folder_id } = body as { folder_id: string | null }

  // Verify translation belongs to user
  const { data: translation, error: fetchError } = await supabase
    .from('translations')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !translation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // If assigning to a folder, verify the folder belongs to user
  if (folder_id) {
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('id')
      .eq('id', folder_id)
      .eq('user_id', user.id)
      .single()

    if (folderError || !folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }
  }

  const service = await createServiceClient()
  const { error: updateError } = await service
    .from('translations')
    .update({ folder_id: folder_id ?? null })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ folder_id: folder_id ?? null })
}
