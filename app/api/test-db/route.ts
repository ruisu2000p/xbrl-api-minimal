import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // Test with both keys
    console.log('Testing database connection...');
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Service key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // Try with anon key first
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    // Try a simple query to test connection
    const { data, error } = await supabase
      .from('financial_documents')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ 
        error: 'Database connection failed', 
        details: error.message,
        code: error.code 
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Database connection successful',
      count: data || 'unknown'
    });

  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({ 
      error: 'Test failed', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}