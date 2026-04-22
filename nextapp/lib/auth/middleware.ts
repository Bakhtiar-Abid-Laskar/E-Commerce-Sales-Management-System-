import { NextRequest, NextResponse } from 'next/server';
import { createServerClient_ } from '@/lib/supabase/server';

/**
 * Verify request is authenticated
 */
export async function requireAuth(request: NextRequest) {
  const supabase = await createServerClient_();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return { user, supabase };
}


