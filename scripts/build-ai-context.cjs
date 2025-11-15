const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EXPORTS_DIR = path.join(__dirname, '../supabase/exports');
const MIGRATIONS_DIR = path.join(__dirname, '../supabase/migrations');
const OUTPUT_DIR = path.join(__dirname, '../supabase/ai_context');

function computeSHA256(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function extractPublicTables(tables) {
  return Object.entries(tables)
    .filter(([key]) => key.startsWith('public.'))
    .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});
}

function buildTablesMin(tables) {
  const result = {};
  for (const [fullName, table] of Object.entries(tables)) {
    const columns = table.columns.map(col => {
      const fk = table.constraints?.find(c => c.type === 'FOREIGN KEY' && c.column === col.name);
      return {
        name: col.name,
        type: col.data_type,
        nullable: col.is_nullable,
        pk: table.constraints?.some(c => c.type === 'PRIMARY KEY' && c.column === col.name) || false,
        fk: fk ? `${fk.foreign_table_schema}.${fk.foreign_table}(${fk.foreign_column})` : null
      };
    });
    result[fullName] = { schema: table.schema, name: table.name, columns };
  }
  return result;
}

function buildTablesFull(tables, indexes) {
  const result = buildTablesMin(tables);
  for (const [fullName, table] of Object.entries(tables)) {
    const tableIndexes = Object.values(indexes).filter(idx => 
      idx.schema === table.schema && idx.table_name === table.name
    ).map(idx => ({ name: idx.name, unique: idx.is_unique, sql: idx.sql }));
    
    const checks = table.constraints?.filter(c => c.type === 'CHECK') || [];
    const uniques = table.constraints?.filter(c => c.type === 'UNIQUE') || [];
    
    result[fullName] = { ...result[fullName], indexes: tableIndexes, checks, uniques };
  }
  return result;
}

function buildRelations(tables) {
  const relations = [];
  for (const table of Object.values(tables)) {
    const fks = table.constraints?.filter(c => c.type === 'FOREIGN KEY') || [];
    for (const fk of fks) {
      relations.push({
        from: `${table.schema}.${table.name}`,
        column: fk.column,
        to: `${fk.foreign_table_schema}.${fk.foreign_table}`,
        toColumn: fk.foreign_column
      });
    }
  }
  return relations;
}

function buildFunctionsMin(functions) {
  const result = {};
  for (const [key, fn] of Object.entries(functions)) {
    if (!fn.schema.startsWith('public')) continue;
    result[key] = {
      schema: fn.schema,
      name: fn.name,
      arguments: fn.arguments,
      purpose: fn.comment || 'Custom function'
    };
  }
  return result;
}

function buildFunctionsFull(functions) {
  const result = buildFunctionsMin(functions);
  for (const [key, fn] of Object.entries(functions)) {
    if (!fn.schema.startsWith('public')) continue;
    result[key] = { ...result[key], sql: fn.sql, comment: fn.comment };
  }
  return result;
}

function buildTriggersMin(triggers) {
  const result = [];
  for (const trigger of Object.values(triggers)) {
    if (!trigger.schema.startsWith('public')) continue;
    const fnName = trigger.sql.match(/EXECUTE FUNCTION (\w+)\(/)?.[1] || 'unknown';
    result.push({
      table: `${trigger.schema}.${trigger.table_name}`,
      trigger: trigger.name,
      function: fnName,
      event: trigger.sql.includes('BEFORE') ? 'BEFORE' : 'AFTER',
      on: trigger.sql.match(/ON (INSERT|UPDATE|DELETE|TRUNCATE)/)?.[0] || ''
    });
  }
  return result;
}

function buildEnumsMin(enums) {
  const result = {};
  for (const [key, en] of Object.entries(enums)) {
    result[key] = { schema: en.schema, name: en.name, values: en.values };
  }
  return result;
}

function generateExamples() {
  return `-- Example SQL operations for PayHub database
-- Generated: ${new Date().toISOString()}

-- 1. Create contractor
INSERT INTO contractors (inn, name, created_at, updated_at)
VALUES ('1234567890', 'ООО "Поставщик"', now(), now())
RETURNING id;

-- 2. Create invoice (triggers update_invoices_updated_at)
INSERT INTO invoices (
  invoice_number, invoice_date, supplier_id, payer_id,
  project_id, invoice_type_id, status_id,
  total_amount, vat_amount, user_id, created_at, updated_at
)
VALUES (
  'INV-001', '2025-01-15', 
  (SELECT id FROM contractors LIMIT 1),
  (SELECT id FROM contractors LIMIT 1 OFFSET 1),
  (SELECT id FROM projects WHERE is_active = true LIMIT 1),
  (SELECT id FROM invoice_types WHERE code = 'standard' LIMIT 1),
  (SELECT id FROM invoice_statuses WHERE code = 'draft' LIMIT 1),
  100000.00, 20000.00,
  auth.uid(), now(), now()
)
RETURNING id;

-- 3. Create payment (triggers calculate_payment_vat, update_payments_updated_at)
INSERT INTO payments (
  payment_number, payment_date, invoice_id,
  amount_without_vat, vat_amount, vat_rate,
  status_id, created_by, created_at, updated_at
)
VALUES (
  'PAY-001', '2025-01-20',
  (SELECT id FROM invoices LIMIT 1),
  100000.00, 20000.00, 20,
  (SELECT id FROM payment_statuses WHERE code = 'pending' LIMIT 1),
  auth.uid(), now(), now()
)
RETURNING id;

-- 4. Link payment to invoice (triggers recalculate_invoice_delivery_date)
INSERT INTO invoice_payments (invoice_id, payment_id, linked_at)
VALUES (
  (SELECT id FROM invoices LIMIT 1),
  (SELECT id FROM payments LIMIT 1),
  now()
);

-- 5. Attach document to invoice (triggers log_attachment_changes)
WITH new_attachment AS (
  INSERT INTO attachments (file_name, file_path, file_size, created_by, created_at, updated_at)
  VALUES ('invoice.pdf', 'invoices/invoice.pdf', 102400, auth.uid(), now(), now())
  RETURNING id
)
INSERT INTO invoice_attachments (invoice_id, attachment_id, linked_at)
SELECT (SELECT id FROM invoices LIMIT 1), id, now()
FROM new_attachment;

-- 6. Create approval route
INSERT INTO payment_approvals (
  payment_id, status_id, created_at, updated_at
)
VALUES (
  (SELECT id FROM payments LIMIT 1),
  (SELECT id FROM payment_statuses WHERE code = 'pending' LIMIT 1),
  now(), now()
)
RETURNING id;

-- 7. Add approval step (triggers audit_approval_steps)
INSERT INTO approval_steps (
  payment_approval_id, stage_id, status,
  acted_by, acted_at, created_at, updated_at
)
VALUES (
  (SELECT id FROM payment_approvals LIMIT 1),
  (SELECT id FROM workflow_stages WHERE is_active = true LIMIT 1),
  'approved', auth.uid(), now(), now(), now()
);

-- 8. Query invoices with related data
SELECT 
  i.id, i.invoice_number, i.invoice_date,
  i.total_amount, i.vat_amount,
  s.name as supplier_name, p.name as project_name,
  ist.name as status_name,
  COUNT(DISTINCT ia.attachment_id) as attachments_count,
  COUNT(DISTINCT ip.payment_id) as payments_count
FROM invoices i
LEFT JOIN contractors s ON i.supplier_id = s.id
LEFT JOIN projects p ON i.project_id = p.id
LEFT JOIN invoice_statuses ist ON i.status_id = ist.id
LEFT JOIN invoice_attachments ia ON i.id = ia.invoice_id
LEFT JOIN invoice_payments ip ON i.id = ip.invoice_id
WHERE i.is_archived = false
GROUP BY i.id, s.name, p.name, ist.name
ORDER BY i.created_at DESC
LIMIT 10;
`;
}

function main() {
  console.log('📦 Building AI context files...');
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const sourceFiles = {
    'tables.json': path.join(EXPORTS_DIR, 'tables.json'),
    'indexes.json': path.join(EXPORTS_DIR, 'indexes.json'),
    'triggers.json': path.join(EXPORTS_DIR, 'triggers.json'),
    'functions.json': path.join(EXPORTS_DIR, 'functions.json'),
    'enums.json': path.join(EXPORTS_DIR, 'enums.json'),
    'prod.sql': path.join(MIGRATIONS_DIR, 'prod.sql')
  };
  
  const hashes = {};
  for (const [name, filePath] of Object.entries(sourceFiles)) {
    hashes[name] = computeSHA256(filePath);
  }
  
  const tables = readJSON(sourceFiles['tables.json']);
  const indexes = readJSON(sourceFiles['indexes.json']);
  const triggers = readJSON(sourceFiles['triggers.json']);
  const functions = readJSON(sourceFiles['functions.json']);
  const enums = readJSON(sourceFiles['enums.json']);
  
  const publicTables = extractPublicTables(tables);
  
  const manifest = {
    generated_at: new Date().toISOString(),
    source_hashes: hashes,
    version: '1.0.0'
  };
  
  const tablesMin = buildTablesMin(publicTables);
  const tablesFull = buildTablesFull(publicTables, indexes);
  const relations = buildRelations(publicTables);
  const functionsMin = buildFunctionsMin(functions);
  const functionsFull = buildFunctionsFull(functions);
  const triggersMin = buildTriggersMin(triggers);
  const enumsMin = buildEnumsMin(enums);
  const examples = generateExamples();
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'ai_manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'ai_tables_min.json'), JSON.stringify(tablesMin, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'ai_tables_full.json'), JSON.stringify(tablesFull, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'ai_relations.json'), JSON.stringify(relations, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'ai_functions_min.json'), JSON.stringify(functionsMin, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'ai_functions_full.json'), JSON.stringify(functionsFull, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'ai_triggers_min.json'), JSON.stringify(triggersMin, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'ai_enums_min.json'), JSON.stringify(enumsMin, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'ai_examples.sql'), examples);
  
  console.log('✅ Generated:');
  console.log('  - ai_manifest.json');
  console.log('  - ai_tables_min.json');
  console.log('  - ai_tables_full.json');
  console.log('  - ai_relations.json');
  console.log('  - ai_functions_min.json');
  console.log('  - ai_functions_full.json');
  console.log('  - ai_triggers_min.json');
  console.log('  - ai_enums_min.json');
  console.log('  - ai_examples.sql');
}

main();

