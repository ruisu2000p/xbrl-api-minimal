/**
 * File Encoding Checker
 * Validates that all source files use UTF-8 encoding without BOM
 */

const fs = require('fs');
const path = require('path');

const DIRECTORIES_TO_CHECK = [
  'app',
  'components',
  'lib',
  'types',
  'utils'
];

const FILE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.md'
];

function checkBOM(buffer) {
  // UTF-8 BOM: 0xEF 0xBB 0xBF
  if (buffer.length >= 3 &&
      buffer[0] === 0xEF &&
      buffer[1] === 0xBB &&
      buffer[2] === 0xBF) {
    return true;
  }
  return false;
}

function isUTF8(buffer) {
  let i = 0;
  while (i < buffer.length) {
    const byte = buffer[i];

    // ASCII
    if (byte <= 0x7F) {
      i++;
      continue;
    }

    // Multi-byte sequence
    let sequenceLength = 0;
    if ((byte & 0xE0) === 0xC0) sequenceLength = 2;
    else if ((byte & 0xF0) === 0xE0) sequenceLength = 3;
    else if ((byte & 0xF8) === 0xF0) sequenceLength = 4;
    else return false;

    // Check continuation bytes
    for (let j = 1; j < sequenceLength; j++) {
      if (i + j >= buffer.length) return false;
      if ((buffer[i + j] & 0xC0) !== 0x80) return false;
    }

    i += sequenceLength;
  }

  return true;
}

function checkFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  const hasBOM = checkBOM(buffer);
  const isValidUTF8 = isUTF8(buffer);

  return {
    path: filePath,
    hasBOM,
    isValidUTF8,
    size: buffer.length
  };
}

function walkDirectory(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist' && file !== 'build') {
        walkDirectory(filePath, fileList);
      }
    } else {
      const ext = path.extname(file);
      if (FILE_EXTENSIONS.includes(ext)) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

console.log('Checking file encodings...\n');

let issues = [];
let checkedFiles = 0;

DIRECTORIES_TO_CHECK.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (fs.existsSync(fullPath)) {
    const files = walkDirectory(fullPath);

    files.forEach(file => {
      const result = checkFile(file);
      checkedFiles++;

      if (result.hasBOM) {
        issues.push(`BOM detected: ${result.path}`);
      }

      if (!result.isValidUTF8) {
        issues.push(`Invalid UTF-8: ${result.path}`);
      }
    });
  }
});

console.log(`Checked ${checkedFiles} files\n`);

if (issues.length > 0) {
  console.log('Issues found:');
  issues.forEach(issue => console.log(`  - ${issue}`));
  console.log('\nTo fix BOM issues, save files as "UTF-8 without BOM" in your editor.');
  process.exit(1);
} else {
  console.log('✓ All files use correct UTF-8 encoding without BOM');
  console.log('✓ Safe for Visual Studio Code editing');
}