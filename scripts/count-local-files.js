const fs = require('fs');
const path = require('path');

const FY2017_BASE_PATH = 'C:\\Users\\pumpk\\OneDrive\\デスクトップ\\アプリ開発\\xbrl\\download_xbrl\\2016_4_1から2017_3_31\\all_markdown_2016_2017_new';

let totalFiles = 0;
let totalCompanies = 0;
let companiesWithFiles = 0;
let companiesWithoutFiles = 0;

const companies = fs.readdirSync(FY2017_BASE_PATH);
totalCompanies = companies.length;

companies.forEach(company => {
  const companyPath = path.join(FY2017_BASE_PATH, company);
  try {
    const stats = fs.statSync(companyPath);
    if (stats.isDirectory()) {
      const files = fs.readdirSync(companyPath);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      
      if (mdFiles.length > 0) {
        totalFiles += mdFiles.length;
        companiesWithFiles++;
        if (companiesWithFiles <= 10) {
          console.log(`✓ ${company}: ${mdFiles.length} files`);
        }
      } else {
        companiesWithoutFiles++;
      }
    }
  } catch (err) {
    console.error(`Error reading ${company}: ${err.message}`);
  }
});

console.log('\n=== FY2017 ローカルファイル統計 ===');
console.log(`総企業数: ${totalCompanies}`);
console.log(`ファイルがある企業: ${companiesWithFiles}`);
console.log(`ファイルがない企業: ${companiesWithoutFiles}`);
console.log(`総Markdownファイル数: ${totalFiles}`);
console.log(`平均ファイル数/企業: ${(totalFiles / companiesWithFiles).toFixed(1)}`);