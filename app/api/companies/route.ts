import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4enlpZHFydnpmemhpY2Z1aGxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTE1NjIyMiwiZXhwIjoyMDcwNzMyMjIyfQ.I48BfRK6_YgAMF0LR9PmhzvFgqwu8fZDp-hz7ZVTvns'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  
  try {
    if (!search) {
      // Return sample companies if no search query
      return NextResponse.json({
        companies: [
          { name: 'トヨタ自動車株式会社', ticker: '7203', available_years: ['FY2022', 'FY2023', 'FY2024'] },
          { name: 'ソニーグループ株式会社', ticker: '6758', available_years: ['FY2022', 'FY2023', 'FY2024'] },
          { name: '任天堂株式会社', ticker: '7974', available_years: ['FY2022', 'FY2023', 'FY2024'] }
        ]
      })
    }
    
    // Search in financial_documents table
    const { data, error } = await supabase
      .from('financial_documents')
      .select('company_name, company_id, fiscal_year')
      .ilike('company_name', `%${search}%`)
      .limit(50)
    
    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
    
    // Group by company
    const companyMap = new Map()
    data?.forEach(doc => {
      if (!companyMap.has(doc.company_name)) {
        companyMap.set(doc.company_name, {
          name: doc.company_name,
          company_id: doc.company_id,
          available_years: []
        })
      }
      const company = companyMap.get(doc.company_name)
      if (!company.available_years.includes(doc.fiscal_year)) {
        company.available_years.push(doc.fiscal_year)
      }
    })
    
    const companies = Array.from(companyMap.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 20)
    
    return NextResponse.json({ companies })
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}