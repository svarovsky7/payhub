const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.cwd();
const CONTEXT_DIR = path.join(ROOT, 'supabase', 'ai_context');
const SOURCE_FILES = [
  'supabase/exports/tables.json',
  'supabase/exports/indexes.json',
  'supabase/exports/triggers.json',
  'supabase/exports/functions.json',
  'supabase/exports/enums.json',
  'supabase/migrations/prod.sql'
];

const tablesJson = readJson('supabase/exports/tables.json');
const indexesJson = readJson('supabase/exports/indexes.json');
const triggersJson = readJson('supabase/exports/triggers.json');
const functionsJson = readJson('supabase/exports/functions.json');
const enumsJson = readJson('supabase/exports/enums.json');

const publicTableEntries = Object.entries(tablesJson)
  .filter(([, value]) => value.schema === 'public')
  .sort((a, b) => a[1].name.localeCompare(b[1].name));

const functionNameLookup = buildFunctionLookup(functionsJson);
const triggerMetadata = parseTriggers(triggersJson, functionNameLookup);
const triggersByTable = buildTriggersByTable(triggerMetadata);
const triggersByFunction = buildTriggersByFunction(triggerMetadata);
const indexesByTable = buildIndexesByTable(indexesJson);

const functionDescriptions = {
  'public.calculate_vat_amounts()': {
    summary: 'Recomputes VAT totals on invoice rows before they persist.',
    details: 'Splits amount_with_vat using vat_rate to back-fill vat_amount and amount_without_vat so downstream reads stay consistent.',
    sideEffects: ['mutates NEW.vat_amount', 'mutates NEW.amount_without_vat']
  },
  'public.delete_contractor_type(type_id_param integer)': {
    summary: 'Deletes a contractor type only when it has no linked contractors.',
    details: 'Counts rows in public.contractors; on success removes the type and returns a success payload, otherwise reports blocking usage.',
    sideEffects: ['DELETE from public.contractor_types']
  },
  'public.delete_project(project_id_param integer)': {
    summary: 'Removes a project together with all user assignments.',
    details: 'Deletes linking rows from public.user_projects before removing the project entry and reports whether anything was deleted.',
    sideEffects: ['DELETE from public.user_projects', 'DELETE from public.projects']
  },
  'public.handle_new_user()': {
    summary: 'Seeds public.user_profiles when auth.users gains a new row.',
    details: 'Copies id, email, and derived full_name from the auth.users record into public.user_profiles for application lookups.',
    sideEffects: ['INSERT into public.user_profiles']
  },
  'public.update_material_request_items_count()': {
    summary: 'Keeps material_requests.total_items in sync with child records.',
    details: 'After INSERT or DELETE on public.material_request_items the trigger recomputes total_items for the parent request id.',
    sideEffects: ['UPDATE public.material_requests']
  },
  'public.update_material_requests_updated_at()': {
    summary: 'Refreshes updated_at on material_requests before changes commit.',
    details: 'Sets NEW.updated_at to now() so list views reflect the latest edits.',
    sideEffects: ['mutates NEW.updated_at']
  },
  'public.update_updated_at()': {
    summary: 'Generic BEFORE UPDATE helper that sets NEW.updated_at to the current timestamp.',
    details: 'Used on legacy tables that require CURRENT_TIMESTAMP instead of now().',
    sideEffects: ['mutates NEW.updated_at']
  },
  'public.update_updated_at_column()': {
    summary: 'Keeps updated_at timestamps fresh on write-heavy tables.',
    details: 'Sets NEW.updated_at to now() in BEFORE UPDATE triggers so audit consumers get monotonic timestamps.',
    sideEffects: ['mutates NEW.updated_at']
  }
};

const tablesMin = buildTablesMin();
const tablesFull = buildTablesFull();
const relations = buildRelations();
const functionsMin = buildFunctionsMin();
const functionsFull = buildFunctionsFull();
const triggersMin = buildTriggersMin();
const enumsMin = buildEnumsMin();
const manifest = buildManifest();
const examplesSql = buildExamplesSql();

fs.mkdirSync(CONTEXT_DIR, { recursive: true });

writeJson('supabase/ai_context/ai_tables_min.json', tablesMin);
writeJson('supabase/ai_context/ai_tables_full.json', tablesFull);
writeJson('supabase/ai_context/ai_relations.json', relations);
writeJson('supabase/ai_context/ai_functions_min.json', functionsMin);
writeJson('supabase/ai_context/ai_functions_full.json', functionsFull);
writeJson('supabase/ai_context/ai_triggers_min.json', triggersMin);
writeJson('supabase/ai_context/ai_enums_min.json', enumsMin);
writeJson('supabase/ai_context/ai_manifest.json', manifest);
writeText('supabase/ai_context/ai_examples.sql', examplesSql);

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function writeJson(relPath, data) {
  const output = JSON.stringify(data, null, 2) + '\n';
  fs.writeFileSync(path.join(ROOT, relPath), output);
}

function writeText(relPath, text) {
  fs.writeFileSync(path.join(ROOT, relPath), text.trimEnd() + '\n');
}

function formatType(column) {
  const type = column.data_type;
  if (type === 'character varying') {
    return column.max_length ? `varchar(${column.max_length})` : 'varchar';
  }
  if (type === 'numeric') {
    const precision = column.numeric_precision;
    const scale = column.numeric_scale;
    if (precision && scale !== null && scale !== undefined) {
      return `numeric(${precision},${scale})`;
    }
    if (precision) {
      return `numeric(${precision})`;
    }
    return 'numeric';
  }
  if (type === 'timestamp with time zone') {
    return 'timestamptz';
  }
  if (type === 'timestamp without time zone') {
    return 'timestamp';
  }
  if (type === 'USER-DEFINED' && column.udt_name) {
    return column.udt_name;
  }
  return type;
}

function getPkSet(table) {
  const set = new Set();
  for (const constraint of table.constraints || []) {
    if (constraint.type === 'PRIMARY KEY' && constraint.column) {
      set.add(constraint.column);
    }
  }
  return set;
}

function extractReferenceFromComment(comment) {
  if (!comment) {
    return null;
  }
  const precise = comment.match(/\((\w+)\.(\w+)\.(\w+)\)/);
  if (precise) {
    return `${precise[1].toLowerCase()}.${precise[2].toLowerCase()}.${precise[3].toLowerCase()}`;
  }
  const loose = comment.match(/(public|auth)\.(\w+)/i);
  if (loose) {
    return `${loose[1].toLowerCase()}.${loose[2].toLowerCase()}.id`;
  }
  return null;
}

function buildForeignKeys(tableKey, table) {
  return table.columns
    .map((column) => {
      const reference = extractReferenceFromComment(column.comment);
      if (!reference) {
        return null;
      }
      return {
        column: column.name,
        references: reference,
        description: column.comment.trim()
      };
    })
    .filter(Boolean);
}


function buildTablesMin() {
  return publicTableEntries.map(([tableKey, table]) => {
    const pkSet = getPkSet(table);
    const foreignKeys = buildForeignKeys(tableKey, table);
    const fkByColumn = new Map(foreignKeys.map((fk) => [fk.column, fk.references]));
    const columns = table.columns.map((column) => {
      const columnData = {
        name: column.name,
        type: formatType(column),
        nullable: column.is_nullable === 'YES'
      };
      if (pkSet.has(column.name)) {
        columnData.pk = true;
      }
      const fk = fkByColumn.get(column.name);
      if (fk) {
        columnData.fk = fk;
      }
      return columnData;
    });

    return {
      table: tableKey,
      columns
    };
  });
}

function collectUniqueConstraints(table) {
  const grouped = new Map();
  for (const constraint of table.constraints || []) {
    if (constraint.type === 'UNIQUE') {
      if (!grouped.has(constraint.name)) {
        grouped.set(constraint.name, new Set());
      }
      if (constraint.column) {
        grouped.get(constraint.name).add(constraint.column);
      }
    }
  }
  return Array.from(grouped.entries()).map(([name, columns]) => ({
    name,
    columns: Array.from(columns)
  }));
}

function collectChecks(table) {
  const matches = [];
  const sql = table.sql || '';
  const regex = /CONSTRAINT\s+(\w+)\s+CHECK\s*\(([^;]+)\)/gi;
  let match;
  while ((match = regex.exec(sql)) !== null) {
    matches.push({ name: match[1], expression: match[2].trim() });
  }
  if (matches.length > 0) {
    return matches;
  }
  const derived = (table.constraints || []).filter((c) => c.type === 'CHECK').map((c) => ({ name: c.name }));
  return derived;
}

function buildTablesFull() {
  return publicTableEntries.map(([tableKey, table]) => {
    const pkSet = getPkSet(table);
    const foreignKeys = buildForeignKeys(tableKey, table);
    const columns = table.columns.map((column) => {
      const columnData = {
        name: column.name,
        type: formatType(column),
        nullable: column.is_nullable === 'YES'
      };
      if (pkSet.has(column.name)) {
        columnData.pk = true;
      }
      if (column.default !== null && column.default !== undefined) {
        columnData.default = column.default;
      }
      const fk = foreignKeys.find((item) => item.column === column.name);
      if (fk) {
        columnData.fk = fk.references;
      }
      if (column.comment) {
        columnData.description = column.comment.trim();
      }
      return columnData;
    });

    const indexes = (indexesByTable.get(tableKey) || []).map((index) => ({
      name: index.name,
      columns: index.columns,
      unique: index.unique
    }));

    const triggers = (triggersByTable.get(tableKey) || []).map((trigger) => ({
      trigger: trigger.name,
      timing: trigger.timing,
      events: trigger.events,
      function: trigger.functionSignature
    }));

    return {
      table: tableKey,
      summary: table.comment ? table.comment.trim() : '',
      columns,
      constraints: {
        primary_key: Array.from(pkSet),
        foreign_keys: foreignKeys.map((fk) => ({
          column: fk.column,
          references: fk.references,
          description: fk.description
        })),
        unique: collectUniqueConstraints(table),
        checks: collectChecks(table)
      },
      indexes,
      triggers
    };
  });
}

function buildRelations() {
  const relations = [];
  for (const [tableKey, table] of publicTableEntries) {
    for (const fk of buildForeignKeys(tableKey, table)) {
      relations.push({
        from: tableKey,
        column: fk.column,
        to: fk.references
      });
    }
  }
  return relations.sort((a, b) => {
    if (a.from !== b.from) {
      return a.from.localeCompare(b.from);
    }
    if (a.column !== b.column) {
      return a.column.localeCompare(b.column);
    }
    return a.to.localeCompare(b.to);
  });
}

function buildFunctionsMin() {
  return Object.entries(functionsJson)
    .filter(([, fn]) => fn.schema === 'public')
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    .map(([key, fn]) => {
      const signature = buildFunctionSignature(fn);
      const summary = (functionDescriptions[signature] && functionDescriptions[signature].summary) || '';
      return {
        function: signature,
        returns: extractReturnType(fn.sql),
        summary
      };
    });
}

function buildFunctionsFull() {
  return Object.entries(functionsJson)
    .filter(([, fn]) => fn.schema === 'public')
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    .map(([key, fn]) => {
      const signature = buildFunctionSignature(fn);
      const description = functionDescriptions[signature] || {};
      const usage = triggersByFunction.get(signature) || [];
      const touches = Array.from(extractTouchedTables(fn.sql)).sort();
      return {
        function: signature,
        returns: extractReturnType(fn.sql),
        language: extractLanguage(fn.sql),
        security: extractSecurity(fn.sql),
        summary: description.summary || '',
        details: description.details || '',
        touches_tables: touches,
        invoked_by: usage,
        side_effects: description.sideEffects || []
      };
    });
}

function buildTriggersMin() {
  return triggerMetadata
    .filter((trigger) => trigger.schema === 'public')
    .map((trigger) => {
      const description = functionDescriptions[trigger.functionSignature];
      return {
        trigger: `${trigger.schema}.${trigger.name}`,
        table: trigger.table,
        timing: trigger.timing,
        events: trigger.events,
        function: trigger.functionSignature,
        purpose: description ? description.summary : ''
      };
    });
}

function buildEnumsMin() {
  return Object.values(enumsJson)
    .map((entry) => ({
      enum: `${entry.schema}.${entry.name}`,
      values: entry.values
    }));
}

function buildManifest() {
  const hashes = {};
  for (const relPath of SOURCE_FILES) {
    const absPath = path.join(ROOT, relPath);
    const content = fs.readFileSync(absPath);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    hashes[relPath.replace(/\\/g, '/')] = hash;
  }
  return {
    generated_at: new Date().toISOString(),
    source_hashes: hashes,
    generator: 'scripts/generate-ai-context.cjs'
  };
}

function buildExamplesSql() {
  return `-- Keep reference dictionaries up to date for the demo flow
INSERT INTO public.invoice_statuses (code, name)
VALUES ('draft', 'Draft'), ('approved', 'Approved')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.payment_statuses (code, name)
VALUES ('posted', 'Posted')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.payment_types (code, name)
VALUES ('wire', 'Wire transfer')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.contractor_types (code, name)
VALUES ('payer', 'Payer company'), ('supplier', 'Supplier company')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- Register counterparties used by invoices and payments
WITH typed AS (
  SELECT ct.code, ct.id FROM public.contractor_types ct WHERE ct.code IN ('payer', 'supplier')
)
INSERT INTO public.contractors (type_id, name, inn, created_by)
VALUES
  ((SELECT id FROM typed WHERE code = 'payer'), 'Acme Facilities LLC', '7701234567', '00000000-0000-0000-0000-000000000001'),
  ((SELECT id FROM typed WHERE code = 'supplier'), 'Orbit Trading LLC', '7712345678', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (name) DO NOTHING;

-- Create a draft invoice; calculate_vat_amounts() derives VAT fields before insert
WITH payer AS (
  SELECT id FROM public.contractors WHERE name = 'Acme Facilities LLC'
), supplier AS (
  SELECT id FROM public.contractors WHERE name = 'Orbit Trading LLC'
), status AS (
  SELECT id FROM public.invoice_statuses WHERE code = 'draft'
)
INSERT INTO public.invoices (
  user_id,
  invoice_number,
  invoice_date,
  payer_id,
  supplier_id,
  status_id,
  amount_with_vat,
  vat_rate,
  description
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'INV-2025-0001',
  CURRENT_DATE,
  (SELECT id FROM payer),
  (SELECT id FROM supplier),
  (SELECT id FROM status),
  120000,
  20,
  'Office fit-out milestone'
)
ON CONFLICT (invoice_number) DO NOTHING
RETURNING amount_with_vat, amount_without_vat, vat_amount;

-- Adjust the invoice total; update_updated_at_column() refreshes updated_at automatically
UPDATE public.invoices
SET amount_with_vat = 150000,
    vat_rate = 10
WHERE invoice_number = 'INV-2025-0001'
RETURNING amount_without_vat, vat_amount, updated_at;

-- Record a payment; triggers assign payment_number and touch updated_at
WITH inv AS (
  SELECT id FROM public.invoices WHERE invoice_number = 'INV-2025-0001'
), status AS (
  SELECT id FROM public.payment_statuses WHERE code = 'posted'
), ptype AS (
  SELECT id FROM public.payment_types WHERE code = 'wire'
)
INSERT INTO public.payments (
  invoice_id,
  amount,
  payment_date,
  description,
  status_id,
  payment_type_id,
  created_by
)
VALUES (
  (SELECT id FROM inv),
  80000,
  CURRENT_DATE,
  'First installment',
  (SELECT id FROM status),
  (SELECT id FROM ptype),
  '00000000-0000-0000-0000-000000000001'
)
RETURNING id, payment_number, updated_at;

-- Link the payment to the invoice allocation table
WITH inv AS (
  SELECT id FROM public.invoices WHERE invoice_number = 'INV-2025-0001'
), pay AS (
  SELECT id FROM public.payments WHERE invoice_id = (SELECT id FROM inv) ORDER BY created_at DESC LIMIT 1
)
INSERT INTO public.invoice_payments (invoice_id, payment_id, allocated_amount)
VALUES (
  (SELECT id FROM inv),
  (SELECT id FROM pay),
  80000
)
ON CONFLICT (invoice_id, payment_id) DO UPDATE SET allocated_amount = EXCLUDED.allocated_amount;

-- Show invoice ledger view with allocations applied
SELECT
  i.invoice_number,
  i.amount_with_vat,
  i.amount_without_vat,
  COALESCE(SUM(ip.allocated_amount), 0) AS paid_amount,
  i.updated_at
FROM public.invoices i
LEFT JOIN public.invoice_payments ip ON ip.invoice_id = i.id
WHERE i.invoice_number = 'INV-2025-0001'
GROUP BY i.id;

-- Create a material request; update_material_requests_updated_at() maintains timestamps
INSERT INTO public.material_requests (
  request_number,
  request_date,
  created_by
)
VALUES (
  'MR-2025-0005',
  CURRENT_DATE,
  '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (request_number) DO UPDATE SET request_date = EXCLUDED.request_date
RETURNING id, total_items, updated_at;

-- Add items: update_material_request_items_count() recalculates total_items after insert
WITH req AS (
  SELECT id FROM public.material_requests WHERE request_number = 'MR-2025-0005'
)
INSERT INTO public.material_request_items (
  material_request_id,
  material_name,
  unit,
  quantity,
  sort_order
)
VALUES
  ((SELECT id FROM req), 'Cable tray 50mm', 'pcs', 40, 1),
  ((SELECT id FROM req), 'Mounting brackets', 'pcs', 80, 2)
ON CONFLICT DO NOTHING;

-- Verify the trigger kept the parent counter in sync
SELECT request_number, total_items
FROM public.material_requests
WHERE request_number = 'MR-2025-0005';
`;
}
function buildFunctionSignature(fn) {
  const args = fn.arguments ? `(${fn.arguments})` : '()';
  return `${fn.schema}.${fn.name}${args}`;
}

function extractReturnType(sql) {
  const match = sql.match(/RETURNS\s+([\w\s]+?)\s+/i);
  return match ? match[1].trim().toLowerCase() : null;
}

function extractLanguage(sql) {
  const match = sql.match(/LANGUAGE\s+(\w+)/i);
  return match ? match[1].toLowerCase() : null;
}

function extractSecurity(sql) {
  if (/SECURITY\s+DEFINER/i.test(sql)) {
    return 'definer';
  }
  if (/SECURITY\s+INVOKER/i.test(sql)) {
    return 'invoker';
  }
  return 'invoker';
}

function extractTouchedTables(sql) {
  const matches = new Set();
  const patterns = [
    /FROM\s+public\.(\w+)/gi,
    /JOIN\s+public\.(\w+)/gi,
    /UPDATE\s+public\.(\w+)/gi,
    /INSERT\s+INTO\s+public\.(\w+)/gi,
    /DELETE\s+FROM\s+public\.(\w+)/gi
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(sql)) !== null) {
      matches.add(`public.${match[1]}`);
    }
  }
  return matches;
}

function buildFunctionLookup(functions) {
  const lookup = new Map();
  for (const fn of Object.values(functions)) {
    const signature = buildFunctionSignature(fn);
    if (!lookup.has(fn.name) || fn.schema === 'public') {
      lookup.set(fn.name, {
        schema: fn.schema,
        signature
      });
    }
  }
  return lookup;
}

function parseTriggers(triggers, functionLookup) {
  const parsed = [];
  for (const entry of Object.values(triggers)) {
    const sql = entry.sql || '';
    const match = sql.match(/CREATE\s+TRIGGER\s+(\w+)\s+(BEFORE|AFTER|INSTEAD OF)\s+([A-Z\s]+?)\s+ON\s+([\w\.]+)/i);
    if (!match) {
      continue;
    }
    const name = match[1];
    const timing = match[2].toUpperCase();
    const events = match[3]
      .split(/\s+OR\s+/i)
      .map((event) => event.trim().toUpperCase());
    const table = match[4].toLowerCase();
    const fnMatch = sql.match(/EXECUTE\s+FUNCTION\s+([\w\.]+)/i);
    let functionName = fnMatch ? fnMatch[1].replace(/"/g, '') : null;
    let functionSignature = null;

    if (functionName && functionName.includes('.')) {
      const parts = functionName.split('.');
      const bare = parts.pop();
      const schema = parts.join('.');
      const lookupKey = bare;
      const lookupValue = functionLookup.get(lookupKey);
      if (lookupValue && lookupValue.schema === schema) {
        functionSignature = lookupValue.signature;
      } else {
        functionSignature = `${schema}.${bare}()`;
      }
    } else if (functionName) {
      const lookupValue = functionLookup.get(functionName);
      if (lookupValue) {
        functionSignature = lookupValue.signature;
      } else if (entry.schema) {
        functionSignature = `${entry.schema}.${functionName}()`;
      } else {
        functionSignature = `${functionName}()`;
      }
    }

    parsed.push({
      schema: entry.schema,
      name,
      table,
      timing,
      events,
      functionSignature
    });
  }
  return parsed;
}

function buildTriggersByTable(triggerList) {
  const map = new Map();
  for (const trigger of triggerList) {
    if (!map.has(trigger.table)) {
      map.set(trigger.table, []);
    }
    map.get(trigger.table).push(trigger);
  }
  return map;
}

function buildTriggersByFunction(triggerList) {
  const map = new Map();
  for (const trigger of triggerList) {
    if (!trigger.functionSignature) {
      continue;
    }
    if (!map.has(trigger.functionSignature)) {
      map.set(trigger.functionSignature, []);
    }
    map.get(trigger.functionSignature).push(`${trigger.schema}.${trigger.name}`);
  }
  return map;
}

function buildIndexesByTable(indexes) {
  const map = new Map();
  for (const entry of Object.values(indexes)) {
    const match = entry.sql && entry.sql.match(/ON\s+([\w\.]+)\s+USING\s+\w+\s*\(([^\)]+)\)/i);
    if (!match) {
      continue;
    }
    const table = match[1].toLowerCase();
    const columns = match[2].split(',').map((part) => part.trim().replace(/\s+/g, ' '));
    if (!map.has(table)) {
      map.set(table, []);
    }
    map.get(table).push({
      name: entry.name,
      columns,
      unique: Boolean(entry.is_unique)
    });
  }
  return map;
}
