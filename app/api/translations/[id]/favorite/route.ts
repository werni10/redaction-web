import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch current state
  const { data: translation, error: fetchError } = await supabase
    .from('translations')
    .select('id, is_favorite')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !translation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const newFavorite = !translation.is_favorite

  const service = await createServiceClient()
  const { error: updateError } = await service
    .from('translations')
    .update({ is_favorite: newFavorite })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ is_favorite: newFavorite })
}
