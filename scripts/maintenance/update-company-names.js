/**
 * Update company_name in markdown_files_metadata table
 * This script populates missing company_name fields by matching company_id with companies table
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateCompanyNames() {
  console.log('Starting company_name update process...');
  
  try {
    // Step 1: Get all unique company_ids with NULL company_name
    console.log('\n1. Fetching records with NULL company_name...');
    const { data: nullRecords, error: nullError } = await supabase
      .from('markdown_files_metadata')
      .select('company_id')
      .is('company_name', null)
      .not('company_id', 'is', null);

    if (nullError) {
      throw nullError;
    }

    // Get unique company IDs
    const uniqueCompanyIds = [...new Set(nullRecords.map(r => r.company_id))];
    console.log(`Found ${uniqueCompanyIds.length} unique company IDs with NULL company_name`);
    console.log(`Total records to update: ${nullRecords.length}`);

    // Step 2: Fetch company names from companies table
    console.log('\n2. Fetching company names from companies table...');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, edinet_code')
      .in('id', uniqueCompanyIds);

    if (companiesError) {
      throw companiesError;
    }

    console.log(`Found ${companies.length} matching companies in companies table`);

    // Create a map for quick lookup
    const companyMap = new Map();
    companies.forEach(company => {
      companyMap.set(company.id, company.name);
      // Also map by edinet_code if available
      if (company.edinet_code) {
        companyMap.set(company.edinet_code, company.name);
      }
    });

    // Step 3: Update records in batches
    console.log('\n3. Updating markdown_files_metadata records...');
    const batchSize = 100;
    let updatedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < uniqueCompanyIds.length; i += batchSize) {
      const batch = uniqueCompanyIds.slice(i, i + batchSize);
      
      for (const companyId of batch) {
        const companyName = companyMap.get(companyId);
        
        if (companyName) {
          const { error: updateError } = await supabase
            .from('markdown_files_metadata')
            .update({ company_name: companyName })
            .eq('company_id', companyId)
            .is('company_name', null);

          if (updateError) {
            console.error(`Failed to update company_id ${companyId}:`, updateError);
            failedCount++;
          } else {
            updatedCount++;
            console.log(`Updated: ${companyId} -> ${companyName}`);
          }
        } else {
          console.warn(`No company name found for company_id: ${companyId}`);
        }
      }
      
      console.log(`Progress: ${Math.min(i + batchSize, uniqueCompanyIds.length)} / ${uniqueCompanyIds.length}`);
    }

    // Step 4: Show results
    console.log('\n=== Update Complete ===');
    console.log(`Successfully updated: ${updatedCount} company IDs`);
    console.log(`Failed updates: ${failedCount}`);
    console.log(`No match found: ${uniqueCompanyIds.length - updatedCount - failedCount}`);

    // Step 5: Verify the update
    console.log('\n4. Verifying update results...');
    const { count } = await supabase
      .from('markdown_files_metadata')
      .select('*', { count: 'exact', head: true })
      .is('company_name', null);

    console.log(`\nRemaining NULL company_name records: ${count}`);

    // Show sample of updated records
    console.log('\n5. Sample of updated records:');
    const { data: sampleData, error: sampleError } = await supabase
      .from('markdown_files_metadata')
      .select('company_id, company_name, fiscal_year')
      .not('company_name', 'is', null)
      .limit(10);

    if (!sampleError && sampleData) {
      console.table(sampleData);
    }

  } catch (error) {
    console.error('Error updating company names:', error);
    process.exit(1);
  }
}

// Alternative approach: Try matching by various patterns
async function updateCompanyNamesAdvanced() {
  console.log('Starting advanced company_name update with pattern matching...');
  
  try {
    // Get all companies from companies table
    const { data: allCompanies, error: companiesError } = await supabase
      .from('companies')
      .select('*');

    if (companiesError) throw companiesError;

    console.log(`Loaded ${allCompanies.length} companies from companies table`);

    // Create multiple lookup maps
    const nameById = new Map();
    const nameByEdinet = new Map();
    const nameByTicker = new Map();

    allCompanies.forEach(company => {
      if (company.id) nameById.set(company.id, company.name);
      if (company.edinet_code) nameByEdinet.set(company.edinet_code, company.name);
      if (company.ticker) nameByTicker.set(company.ticker, company.name);
    });

    // Get records to update
    const { data: recordsToUpdate, error: fetchError } = await supabase
      .from('markdown_files_metadata')
      .select('id, company_id')
      .is('company_name', null)
      .not('company_id', 'is', null)
      .limit(1000); // Process in chunks

    if (fetchError) throw fetchError;

    console.log(`Processing ${recordsToUpdate.length} records...`);

    let successCount = 0;
    for (const record of recordsToUpdate) {
      let companyName = null;

      // Try different matching strategies
      companyName = nameById.get(record.company_id) || 
                    nameByEdinet.get(record.company_id) ||
                    nameByTicker.get(record.company_id);

      if (companyName) {
        const { error: updateError } = await supabase
          .from('markdown_files_metadata')
          .update({ company_name: companyName })
          .eq('id', record.id);

        if (!updateError) {
          successCount++;
          if (successCount % 100 === 0) {
            console.log(`Updated ${successCount} records...`);
          }
        }
      }
    }

    console.log(`\n=== Advanced Update Complete ===`);
    console.log(`Successfully updated: ${successCount} records`);

  } catch (error) {
    console.error('Error in advanced update:', error);
  }
}

// Main execution
async function main() {
  console.log('Company Name Update Script');
  console.log('==========================\n');

  // Try basic update first
  await updateCompanyNames();

  // If many records remain, try advanced matching
  const { count } = await supabase
    .from('markdown_files_metadata')
    .select('*', { count: 'exact', head: true })
    .is('company_name', null);

  if (count > 1000) {
    console.log('\nMany records still have NULL company_name. Trying advanced matching...');
    await updateCompanyNamesAdvanced();
  }

  console.log('\n✅ Script completed!');
}

main().catch(console.error);