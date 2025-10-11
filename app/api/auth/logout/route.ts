import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase/unified-client';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();

    // Sign out the user on the server side
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Server-side logout error:', error);
      // Even if signOut fails, return success - cookies will be cleared by middleware
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout API error:', error);
    // Return success even on error - the redirect will handle session cleanup
    return NextResponse.json({ success: true });
  }
}
