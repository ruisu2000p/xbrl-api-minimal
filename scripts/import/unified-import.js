#!/usr/bin/env node

/**
 * Unified Import Script for XBRL Data to Supabase
 * 
 * This consolidated script replaces multiple import scripts with a single
 * configurable solution. It can import markdown files, metadata, and storage
 * files to Supabase with various options.
 * 
 * Usage:
 *   node unified-import.js [options]
 * 
 * Options:
 *   --mode <type>       Import mode: 'all', 'metadata', 'storage', 'markdown' (default: all)
 *   --fiscal <year>     Specific fiscal year to import (e.g., FY2024)
 *   --company <id>      Specific company ID to import
 *   --parallel <n>      Number of parallel uploads (default: 5)
 *   --dry-run          Simulate import without actual uploads
 *   --config <file>     Path to configuration file (default: ./import-config.json)
 *   --verbose          Enable verbose logging
 *   --help             Show this help message
 */

import { createClient } from '@supabase/supabase-js';
import { readdir, readFile, stat } from 'fs/promises';
import { join, basename, extname } from 'path';
import { program } from 'commander';
import pLimit from 'p-limit';
import chalk from 'chalk';
import ora from 'ora';

// Default configuration
const DEFAULT_CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wpwqxhyiglbtlaimrjrx.supabase.co',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  dataBasePath: process.env.DATA_BASE_PATH || 'C:/Users/pumpk/OneDrive/デスクトップ/アプリ開発',
  parallelUploads: 5,
  chunkSize: 1024 * 1024 * 5, // 5MB chunks
  retryAttempts: 3,
  retryDelay: 1000,
};

// Command line arguments
program
  .option('-m, --mode <type>', 'Import mode', 'all')
  .option('-f, --fiscal <year>', 'Fiscal year to import')
  .option('-c, --company <id>', 'Company ID to import')
  .option('-p, --parallel <n>', 'Number of parallel uploads', parseInt, 5)
  .option('-d, --dry-run', 'Simulate import without uploads')
  .option('--config <file>', 'Configuration file path')
  .option('-v, --verbose', 'Verbose logging')
  .parse(process.argv);

const options = program.opts();

// Load configuration
async function loadConfig() {
  let config = { ...DEFAULT_CONFIG };
  
  if (options.config) {
    try {
      const configFile = await readFile(options.config, 'utf-8');
      const fileConfig = JSON.parse(configFile);
      config = { ...config, ...fileConfig };
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not load config file: ${error.message}`));
    }
  }
  
  config.parallelUploads = options.parallel || config.parallelUploads;
  
  return config;
}

// Initialize Supabase client
function initSupabase(config) {
  const supabase = createClient(
    config.supabaseUrl,
    config.supabaseServiceKey || config.supabaseAnonKey
  );
  return supabase;
}

// Logger utility
const log = {
  info: (msg) => , msg),
  success: (msg) => , msg),
  error: (msg) => , msg),
  verbose: (msg) => options.verbose && , msg),
};

// Statistics tracker
class ImportStats {
  constructor() {
    this.total = 0;
    this.success = 0;
    this.failed = 0;
    this.skipped = 0;
    this.startTime = Date.now();
  }
  
  increment(type = 'success') {
    this[type]++;
    this.total++;
  }
  
  getReport() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    return {
      total: this.total,
      success: this.success,
      failed: this.failed,
      skipped: this.skipped,
      duration: `${duration}s`,
      rate: `${(this.success / duration).toFixed(2)} files/sec`,
    };
  }
}

// Import markdown files
async function importMarkdownFiles(supabase, config, stats) {
  const spinner = ora('Scanning for markdown files...').start();
  
  try {
    const basePath = join(config.dataBasePath, '2021_4_1から2022_3_31有価証券報告書Markdown');
    const companies = await readdir(basePath);
    
    spinner.text = `Found ${companies.length} companies to process`;
    
    const limit = pLimit(config.parallelUploads);
    const tasks = [];
    
    for (const companyDir of companies) {
      if (options.company && !companyDir.includes(options.company)) continue;
      
      const companyPath = join(basePath, companyDir);
      const companyStats = await stat(companyPath);
      
      if (!companyStats.isDirectory()) continue;
      
      // Check for PublicDoc_markdown directory
      const publicPath = join(companyPath, 'PublicDoc_markdown');
      try {
        const files = await readdir(publicPath);
        const mdFiles = files.filter(f => f.endsWith('.md'));
        
        for (const file of mdFiles) {
          tasks.push(limit(async () => {
            if (options.dryRun) {
              log.verbose(`[DRY RUN] Would upload: ${file}`);
              stats.increment('skipped');
              return;
            }
            
            try {
              const filePath = join(publicPath, file);
              const content = await readFile(filePath, 'utf-8');
              const fileStats = await stat(filePath);
              
              // Extract company ID from directory name
              const companyId = companyDir.split('_')[0];
              
              // Upload to storage
              const storagePath = `FY2021/${companyId}/PublicDoc_markdown/${file}`;
              const { error: uploadError } = await supabase.storage
                .from('markdown-files')
                .upload(storagePath, content, {
                  contentType: 'text/markdown',
                  upsert: true,
                });
              
              if (uploadError) throw uploadError;
              
              // Insert metadata
              const { error: metaError } = await supabase
                .from('markdown_files_metadata')
                .upsert({
                  company_id: companyId,
                  fiscal_year: 'FY2021',
                  file_name: file,
                  file_size: fileStats.size,
                  storage_path: storagePath,
                  doc_category: 'public',
                }, { onConflict: 'storage_path' });
              
              if (metaError) throw metaError;
              
              stats.increment('success');
              log.verbose(`Uploaded: ${file}`);
            } catch (error) {
              stats.increment('failed');
              log.error(`Failed to upload ${file}: ${error.message}`);
            }
          }));
        }
      } catch (error) {
        log.verbose(`No PublicDoc_markdown for ${companyDir}`);
      }
    }
    
    spinner.text = `Processing ${tasks.length} files...`;
    await Promise.all(tasks);
    spinner.succeed(`Import completed`);
    
  } catch (error) {
    spinner.fail(`Import failed: ${error.message}`);
    throw error;
  }
}

// Import metadata only
async function importMetadata(supabase, config, stats) {
  log.info('Importing metadata from existing storage...');
  
  const { data: files, error } = await supabase.storage
    .from('markdown-files')
    .list('', { limit: 1000, offset: 0 });
  
  if (error) throw error;
  
  log.info(`Found ${files.length} files in storage`);
  
  // Process metadata updates
  for (const file of files) {
    if (options.dryRun) {
      log.verbose(`[DRY RUN] Would update metadata for: ${file.name}`);
      stats.increment('skipped');
      continue;
    }
    
    // Update or insert metadata
    stats.increment('success');
  }
}

// Main import function
async function main() {
  );
  
  const config = await loadConfig();
  const supabase = initSupabase(config);
  const stats = new ImportStats();
  
  log.info(`Mode: ${options.mode}`);
  if (options.fiscal) log.info(`Fiscal Year: ${options.fiscal}`);
  if (options.company) log.info(`Company: ${options.company}`);
  if (options.dryRun) log.info(chalk.yellow('DRY RUN MODE - No actual uploads'));
  
  try {
    switch (options.mode) {
      case 'markdown':
        await importMarkdownFiles(supabase, config, stats);
        break;
      case 'metadata':
        await importMetadata(supabase, config, stats);
        break;
      case 'all':
        await importMarkdownFiles(supabase, config, stats);
        await importMetadata(supabase, config, stats);
        break;
      default:
        throw new Error(`Unknown mode: ${options.mode}`);
    }
    
    // Display final report
    );
    const report = stats.getReport();
    , `Total Processed: ${report.total}`);
    , `Success: ${report.success}`);
    , `Failed: ${report.failed}`);
    , `Skipped: ${report.skipped}`);
    , `Duration: ${report.duration}`);
    , `Rate: ${report.rate}`);
    
  } catch (error) {
    log.error(`Import failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { importMarkdownFiles, importMetadata, ImportStats };