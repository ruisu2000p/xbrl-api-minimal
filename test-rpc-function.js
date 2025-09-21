// Test RPC function for English name search
const fetch = require('node-fetch');

const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMTk1NDEsImV4cCI6MjA3Mzc5NTU0MX0.aGMCRtTRIbdUMRTdJ7KFZ7oJ2krkD7QWzUEcTs7Jlfs';

async function testSearch(query) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_markdown_with_english`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_query: query })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Search results for "${query}":`);
    console.log(JSON.stringify(data.slice(0, 3), null, 2));
    return data;
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Test English search
testSearch('Toyota').then(() => {
  // Test Japanese search
  return testSearch('ソニー');
});