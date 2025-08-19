'use strict';

// 用法示例（PowerShell）：
// $env:SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
// $env:SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
// node ./src/scripts/seed-tech-staff.js --file=./src/scripts/staff.csv
//
// 说明：
// - 仅 service_role 可以写入。不要在前端使用该 key。
// - CSV 必须包含表头：name,department,active
// - department 仅允许：技术部 / 创意部（默认为 技术部）
// - active 可取：true/false（不区分大小写，默认为 true）

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function parseBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v !== 'string') return true;
  const s = v.trim().toLowerCase();
  if (s === 'true' || s === '1' || s === 'yes' || s === 'y') return true;
  if (s === 'false' || s === '0' || s === 'no' || s === 'n') return false;
  return true;
}

function normalizeDepartment(dep) {
  const d = (dep || '').trim();
  return d === '创意部' ? '创意部' : '技术部';
}

function parseCSV(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) {
    throw new Error('CSV 至少需要包含表头与一行数据：name,department,active');
  }
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const idxName = header.indexOf('name');
  const idxDept = header.indexOf('department');
  const idxActive = header.indexOf('active');
  if (idxName === -1 || idxDept === -1 || idxActive === -1) {
    throw new Error('CSV 表头必须包含 name,department,active');
  }
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    if (cols.length === 0 || cols.every(c => c === '')) continue;
    const name = cols[idxName];
    if (!name) continue;
    const department = normalizeDepartment(cols[idxDept]);
    const active = parseBool(cols[idxActive]);
    rows.push({ name, department, active });
  }
  return rows;
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const fileArg = args.find(a => a.startsWith('--file='));
    const filePath = fileArg ? fileArg.split('=')[1] : 'src/scripts/staff.csv';
    const csvPath = path.resolve(process.cwd(), filePath);

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      console.error('[ERROR] 请设置环境变量 SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY');
      process.exit(1);
    }

    const client = createClient(url, serviceKey, { auth: { persistSession: false } });

    if (!fs.existsSync(csvPath)) {
      console.error(`[ERROR] 未找到 CSV 文件：${csvPath}`);
      process.exit(1);
    }

    const rows = parseCSV(csvPath);
    if (rows.length === 0) {
      console.warn('[WARN] CSV 无有效数据，未执行写入');
      process.exit(0);
    }

    // 依赖数据库中存在唯一约束 (name, department)
    const { data, error } = await client
      .from('tech_staff')
      .upsert(rows, { onConflict: 'name,department' })
      .select('id,name,department,active');

    if (error) {
      console.error('[ERROR] 写入失败：', error);
      process.exit(1);
    }

    console.log(`[OK] 写入/更新 ${data?.length ?? 0} 条人员记录`);
    process.exit(0);
  } catch (e) {
    console.error('[ERROR] 执行失败：', e);
    process.exit(1);
  }
}

main();