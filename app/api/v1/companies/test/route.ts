// Test endpoint for debugging search
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || searchParams.get('search');
    
    // Test basic query
    let dbQuery = supabase
      .from('companies')
      .select('id, name, ticker')
      .limit(10);
    
    if (query) {
      // Try different search methods
      const results: any = {};
      
      // Method 1: ilike on name
      const { data: nameSearch, error: nameError } = await supabase
        .from('companies')
        .select('id, name')
        .ilike('name', `%${query}%`)
        .limit(5);
      
      results.nameSearch = { data: nameSearch, error: nameError };
      
      // Method 2: or filter
      const { data: orSearch, error: orError } = await supabase
        .from('companies')
        .select('id, name')
        .or(`name.ilike.%${query}%,id.ilike.%${query}%`)
        .limit(5);
      
      results.orSearch = { data: orSearch, error: orError };
      
      // Method 3: textSearch if available
      const { data: allData, error: allError } = await supabase
        .from('companies')
        .select('id, name')
        .limit(100);
      
      const filtered = allData?.filter(c => 
        c.name?.toLowerCase().includes(query.toLowerCase())
      ) || [];
      
      results.clientFilter = { 
        data: filtered.slice(0, 5), 
        total: filtered.length,
        error: allError 
      };
      
      return NextResponse.json({
        query,
        results,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
      });
    }
    
    // No search, just return first 10
    const { data, error } = await dbQuery;
    
    return NextResponse.json({
      query,
      data,
      error,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
    });
    
  } catch (error) {
    console.error('Test API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}