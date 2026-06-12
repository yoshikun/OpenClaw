#!/usr/bin/env node
/**
 * solo-config-field skill — add fields to Luban Excel config tables
 *
 * Usage:
 *   node add_field.mjs <tableName> <fieldName> <fieldType> [--group c|s|e] [--desc "注释"] [--default "默认值"] [--after existingField]
 *
 * Examples:
 *   node add_field.mjs Card testField int
 *   node add_field.mjs Common testField float --group c --desc "测试字段" --default 0.5
 *   node add_field.mjs Card testField "(list#sep=,),int" --after id
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import * as XLSX from 'xlsx';

// ── Config ────────────────────────────────────────────────────
const SOLO_CONFIG = 'E:\\Solo\\nightoffullmoon\\client\\config\\SoloConfig';
const DATAS_DIR   = join(SOLO_CONFIG, 'Datas');
const TABLES_DEF  = join(DATAS_DIR, '__tables__.xlsx');
const BEANS_DEF   = join(DATAS_DIR, '__beans__.xlsx');
const ENUMS_DEF   = join(DATAS_DIR, '__enums__.xlsx');

// ── Pre-flight: git pull + close Excel ─────────────────────────
function preflight() {
  const soloDir = SOLO_CONFIG;

  // 1. git pull
  console.log('🔄 Updating SoloConfig submodule...');
  try {
    execSync('git pull', { cwd: soloDir, stdio: 'pipe', timeout: 30000 });
    console.log('   ✅ git pull OK');
  } catch (e) {
    const msg = e.stderr?.toString() || e.message || '';
    console.warn('   ⚠️ git pull warning:', msg.split('\n').slice(0, 2).join(' '));
  }

  // 2. Kill Excel processes
  console.log('🔍 Checking Excel processes...');
  try {
    // tasklist returns non-zero exit code when no matching process → catch handles it
    const out = execSync('tasklist /FI "IMAGENAME eq EXCEL.EXE" /NH /FO CSV', {
      cwd: soloDir, stdio: ['pipe', 'pipe', 'pipe'], timeout: 5000, encoding: 'utf8'
    });
    console.log('   ⚠️ Excel is open — terminating...');
    try { execSync('taskkill /F /IM EXCEL.EXE', { stdio: 'pipe', timeout: 5000 }); } catch {}
    console.log('   ✅ Excel closed');
  } catch (e) {
    // No Excel process found — normal
    console.log('   ✅ No Excel process detected');
  }
  console.log('');
}

// xlsx 0.18.x → read is the function, readFile may be absent
function readXlsx(path) {
  const buf = readFileSync(path);
  return XLSX.read(buf, { type: 'buffer' });
}

// ── Help ──────────────────────────────────────────────────────
function printHelp() {
  console.log(`
Usage: node add_field.mjs <tableName> <fieldName> <fieldType> [options]

Options:
  --group  c|s|e         分组标识（默认 c,s）
  --desc   "注释"          字段中文注释
  --default "默认值"       已有行的默认填充值（默认空）
  --after  existingField  在哪列后面插入（默认追加到末尾）

Examples:
  node add_field.mjs Card newField int --group c,s --desc "新字段"
  node add_field.mjs Common newField float --group c --default 0
  node add_field.mjs Buff newField "(list#sep=,),int"

Tables Defined:
` + listTables());
}

function listTables() {
  if (!existsSync(TABLES_DEF)) return '  [__tables__.xlsx not found]';
  const wb = readXlsx(TABLES_DEF);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const tableRows = rows.filter(r => r[1] && r[1].startsWith('Tb'));
  return tableRows.map(r => {
    const name = String(r[1] || '').padEnd(30);   // TbHeroSkin
    const file = String(r[4] || '').padEnd(20);
    const grp = r[6] ? 'group:' + String(r[6]) : '';
    return `  ${name} → ${file} ${grp}`;
  }).join('\n');
}

// ── Find table definition from __tables__.xlsx ────────────────
function findTableDef(tableName) {
  if (!existsSync(TABLES_DEF)) {
    console.error('❌ __tables__.xlsx not found at:', TABLES_DEF);
    process.exit(2);
  }
  const wb = readXlsx(TABLES_DEF);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const normalized = tableName.replace(/^Tb/i, '').toLowerCase();

  const def = rows.find(r => {
    // __tables__.xlsx: col0(##var)=空, col1=TbName, col2=NameConfig, col4=dataFileName
    const col1 = String(r[1] || '').trim();   // TbHeroSkin
    const col2 = String(r[2] || '').trim();   // HeroSkinConfig
    const col0 = String(r[0] || '').trim();   // (usually empty)
    return col1.replace(/^Tb/i, '').toLowerCase() === normalized
        || col2.replace(/Config$/i, '').toLowerCase() === normalized
        || col0.replace(/^Tb/i, '').toLowerCase() === normalized;
  });
  return def;
}

// ── Add field to list-format table (like Card.xlsx) ──────────
function addToListTable(wb, ws, rows, fieldName, fieldType, group, desc, defaultVal, after) {
  // Find header rows: ##var, ##type, ##group, comment
  let varRow = -1, typeRow = -1, groupRow = -1, commentRow = -1;

  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const cell = String(rows[i]?.[0] || '');
    if (cell === '##var') varRow = i;
    else if (cell === '##type') typeRow = i;
    else if (cell === '##group') groupRow = i;
    else if (cell.startsWith('##') && varRow >= 0 && typeRow >= 0 && commentRow === -1 && groupRow >= 0) commentRow = i;
  }

  if (varRow === -1 || typeRow === -1) {
    console.error('❌ Cannot find header rows (##var / ##type)');
    process.exit(1);
  }

  // Determine insertion column
  const headerCells = rows[varRow];
  let insertCol = headerCells.length;
  // Find first empty column after the last non-empty header
  for (let c = headerCells.length - 1; c >= 0; c--) {
    if (headerCells[c] !== undefined && headerCells[c] !== null && String(headerCells[c]).trim() !== '') {
      insertCol = c + 1;
      break;
    }
  }
  if (insertCol < headerCells.length) insertCol = headerCells.length;

  if (after) {
    const afterIdx = headerCells.findIndex((c, i) => String(c || '').trim() === after);
    if (afterIdx >= 0) {
      insertCol = afterIdx + 1;
    } else {
      console.warn(`⚠️ Field "${after}" not found, appending to end.`);
    }
  }

  // Helper: write cell value
  function setCell(r, c, val, type) {
    const addr = XLSX.utils.encode_cell({ r, c });
    if (val === undefined || val === null) return;
    ws[addr] = { t: type || 's', v: val };
  }

  // Write headers
  setCell(varRow, insertCol, fieldName, 's');
  setCell(typeRow, insertCol, fieldType, 's');
  if (groupRow >= 0) setCell(groupRow, insertCol, group, 's');
  if (commentRow >= 0 && desc) setCell(commentRow, insertCol, desc, 's');

  // Fill default for existing data rows
  if (defaultVal !== undefined && defaultVal !== null) {
    const dataStart = Math.max(varRow, typeRow, groupRow, commentRow) + 1;
    for (let r = dataStart; r < rows.length; r++) {
      if (!rows[r]) continue;
      const firstCell = String(rows[r][0] || '');
      // Skip ## comment rows
      if (firstCell.startsWith('##') || firstCell.startsWith('#')) continue;
      // Skip completely empty rows
      if (rows[r].every(c => c === undefined || c === null || String(c).trim() === '')) continue;

      const num = Number(defaultVal);
      if (!isNaN(num) && fieldType !== 'string' && !fieldType.includes('string')) {
        setCell(r, insertCol, num, 'n');
      } else {
        setCell(r, insertCol, String(defaultVal), 's');
      }
    }
  }

  // Update !ref range to include the new column
  if (ws['!ref']) {
    const ref = XLSX.utils.decode_range(ws['!ref']);
    if (insertCol > ref.e.c) {
      ref.e.c = insertCol;
      ws['!ref'] = XLSX.utils.encode_range(ref);
    }
  }

  console.log(`✅ Added field "${fieldName}" (${fieldType}) at column index ${insertCol + 1}`);
  return true;
}

// ── Add entry to key-value table (like Common.xlsx) ──────────
function addToKvTable(wb, ws, rows, fieldName, fieldType, group, desc, defaultVal, after) {
  // KV format: ##column#var | ##type | ##group | (desc) | (value)
  // Each row = new key-value entry

  function setCell(r, c, val, type) {
    const addr = XLSX.utils.encode_cell({ r, c });
    if (val === undefined || val === null) return;
    ws[addr] = { t: type || 's', v: val };
  }

  // Find the last data row
  let newRow = rows.length;
  for (let r = rows.length - 1; r >= 0; r--) {
    if (rows[r] && rows[r].some(c => c !== undefined && c !== null && String(c).trim() !== '')) {
      newRow = r + 1;
      break;
    }
  }

  // Write: [fieldName, fieldType, group, desc, defaultVal]
  const values = [fieldName, fieldType, group || '', desc || ''];
  const defaultStr = defaultVal !== undefined ? String(defaultVal) : '';
  values.push(defaultStr);

  values.forEach((val, ci) => {
    if (val !== undefined && val !== null && val !== '') {
      const num = Number(val);
      if (!isNaN(num) && fieldType !== 'string' && !fieldType.includes('string')) {
        // Types like "(list#sep=,),int" should stay as string
        if (fieldType === 'int' || fieldType === 'float' || fieldType === 'long' || fieldType === 'double') {
          setCell(newRow, ci, num, 'n');
        } else {
          setCell(newRow, ci, val, 's');
        }
      } else {
        setCell(newRow, ci, val, 's');
      }
    }
  });

  // Update !ref range to include the new row
  if (ws['!ref']) {
    const ref = XLSX.utils.decode_range(ws['!ref']);
    if (newRow > ref.e.r) {
      ref.e.r = newRow;
      ws['!ref'] = XLSX.utils.encode_range(ref);
    }
  }

  console.log(`✅ Added KV entry "${fieldName}" (${fieldType}) at row ${newRow + 1}`);
  return true;
}

// ── Main ──────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    process.exit(0);
  }

  const tableName = args[0];
  const fieldName = args[1];
  const fieldType = args[2];

  if (!tableName || !fieldName || !fieldType) {
    console.error('❌ Missing required args: <tableName> <fieldName> <fieldType>');
    printHelp();
    process.exit(1);
  }

  // Parse options
  let group = 'c,s';
  let desc = '';
  let defaultVal = undefined;
  let after = undefined;

  for (let i = 3; i < args.length; i++) {
    if (args[i] === '--group' && i + 1 < args.length) group = args[++i];
    else if (args[i] === '--desc' && i + 1 < args.length) desc = args[++i];
    else if (args[i] === '--default' && i + 1 < args.length) defaultVal = args[++i];
    else if (args[i] === '--after' && i + 1 < args.length) after = args[++i];
  }

  // 0. Pre-flight: git pull + close Excel
  preflight();

  // 1. Lookup table
  const tableDef = findTableDef(tableName);
  if (!tableDef) {
    console.error(`❌ Table "${tableName}" not found in __tables__.xlsx`);
    console.log('Available tables:');
    console.log(listTables());
    process.exit(1);
  }

  const dataFileName = String(tableDef[4] || '').trim();
  if (!dataFileName) {
    console.error('❌ No data file specified for this table');
    process.exit(1);
  }

  const dataFile = join(DATAS_DIR, dataFileName);
  if (!existsSync(dataFile)) {
    console.error(`❌ Data file not found: ${dataFile}`);
    process.exit(1);
  }

  console.log(`📂 Table: ${String(tableDef[1] || '')} (${String(tableDef[2] || '')})`);
  console.log(`📄 File: ${dataFileName}`);
  console.log(`🔧 Adding: ${fieldName} : ${fieldType}`);

  // 2. Read the data xlsx
  const wb = readXlsx(dataFile);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // 3. Determine format — KV or List
  const firstCell = String(rows[0]?.[0] || '');
  const isKvTable = firstCell === '##column#var';

  if (isKvTable) {
    addToKvTable(wb, ws, rows, fieldName, fieldType, group, desc, defaultVal, after);
  } else {
    addToListTable(wb, ws, rows, fieldName, fieldType, group, desc, defaultVal, after);
  }

  // 4. Save
  const outBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  writeFileSync(dataFile, outBuf);
  console.log(`💾 Saved: ${dataFile}`);
  console.log('');
  console.log('⚠️  Next steps:');
  console.log('   1. Run Luban to regenerate code (via Unity BuildPipeline)');
  console.log('   2. Update server/client code to use the new field');
  console.log('   3. Commit SoloConfig submodule changes');
}

main();
