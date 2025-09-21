import fs from "fs"
import path from "path"
import crypto from "crypto"

const root = process.cwd()
const exportsDir = path.join(root, "supabase", "exports")
const aiDir = path.join(root, "supabase", "ai_context")

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"))

const tables = readJson(path.join(exportsDir, "tables.json"))
const indexes = readJson(path.join(exportsDir, "indexes.json"))
const triggers = readJson(path.join(exportsDir, "triggers.json"))
const functions = readJson(path.join(exportsDir, "functions.json"))
const enumsPath = path.join(exportsDir, "enums.json")
const enums = fs.existsSync(enumsPath) ? readJson(enumsPath) : {}

const tableSummaries = {
  "public.contractor_types": "Dictionary of contractor categories used to classify payments and obligations.",
  "public.contractors": "Registered contractors with type, tax id and authoring user.",
  "public.invoices": "Outbound invoices tracked by PayHub with amount, status and owner.",
  "public.projects": "Projects that group invoices and contractors for reporting.",
  "public.roles": "Access roles managed inside PayHub.",
  "public.user_profiles": "User profile mirror for Supabase auth users.",
}

const columnNotes = {
  "public.contractor_types": {
    id: "Surrogate primary key.",
    code: "Short machine code of contractor type.",
    name: "Human friendly type name.",
    description: "Optional operator facing description.",
    created_at: "Creation timestamp (default now()).",
    updated_at: "Audit timestamp updated by trigger before UPDATE.",
  },
  "public.contractors": {
    id: "Surrogate primary key.",
    type_id: "FK to contractor_types.id that classifies the contractor.",
    name: "Full legal name or personal name.",
    inn: "Russian tax id (12 digits for sole proprietors/legal entities).",
    created_by: "auth.users.id of the user who created the record.",
    created_at: "Creation timestamp.",
    updated_at: "Auto refreshed by update_updated_at_column().",
  },
  "public.invoices": {
    id: "Invoice UUID.",
    user_id: "auth.users.id that owns the invoice.",
    invoice_number: "External reference or invoice number.",
    amount: "Total amount in settlement currency.",
    status: "Workflow status label.",
    description: "Optional narrative description.",
    due_date: "Payment due date.",
    created_at: "Creation timestamp.",
    updated_at: "Auto refreshed timestamp.",
  },
  "public.projects": {
    id: "Surrogate primary key.",
    code: "Optional unique project code.",
    name: "Project name.",
    description: "Project description for internal teams.",
    is_active: "Activity flag, defaults to true.",
    created_by: "auth.users.id that created the project.",
    created_at: "Creation timestamp.",
    updated_at: "Auto refreshed timestamp.",
  },
  "public.roles": {
    id: "Role primary key.",
    code: "Unique role code.",
    name: "Display name of the role.",
    description: "Optional usage notes.",
    created_at: "Creation timestamp.",
    updated_at: "Auto refreshed timestamp.",
  },
  "public.user_profiles": {
    id: "Primary key and FK to auth.users.id.",
    email: "User email.",
    full_name: "Display name for UI.",
    created_at: "Creation timestamp.",
    updated_at: "Auto refreshed timestamp.",
  },
}

const fkOverrides = {
  "public.contractors": {
    type_id: {
      reference: "public.contractor_types.id",
      description: "Contractor category reference.",
    },
    created_by: {
      reference: "auth.users.id",
      description: "Authoring Supabase user.",
    },
  },
  "public.invoices": {
    user_id: {
      reference: "auth.users.id",
      description: "Invoice owner.",
    },
  },
  "public.projects": {
    created_by: {
      reference: "auth.users.id",
      description: "User that registered the project.",
    },
  },
  "public.user_profiles": {
    id: {
      reference: "auth.users.id",
      description: "Profile mirrors Supabase auth user.",
    },
  },
}

const functionSummaries = {
  "public.handle_new_user": {
    summary: "Provision user_profiles row when a Supabase auth user is created.",
    details: "Inserts email and full_name (from raw_user_meta_data) into public.user_profiles and returns NEW.",
    tablesTouched: ["public.user_profiles"],
    sideEffects: ["INSERT"],
  },
  "public.update_updated_at_column": {
    summary: "BEFORE UPDATE trigger that stamps NEW.updated_at with now().",
    details: "Mutates the NEW record to keep updated_at current; reused across catalog tables.",
    tablesTouched: [],
    sideEffects: ["MUTATE NEW"],
  },
}

const formatType = (column) => {
  const { data_type: dataType, max_length: maxLength, numeric_precision: precision, numeric_scale: scale } = column
  switch ((dataType || "").toLowerCase()) {
    case "character varying":
      return maxLength ? `varchar(${maxLength})` : "varchar"
    case "numeric":
      return precision && scale != null ? `numeric(${precision},${scale})` : "numeric"
    case "timestamp with time zone":
      return "timestamptz"
    case "integer":
      return "integer"
    case "uuid":
      return "uuid"
    case "text":
      return "text"
    case "boolean":
      return "boolean"
    default:
      return dataType
  }
}

const buildIndexMap = () => {
  const result = {}
  for (const idx of Object.values(indexes)) {
    const match = idx.sql.match(/ON\s+([a-zA-Z0-9_.\"]+)\s+USING/i)
    if (!match) continue
    const table = match[1].replace(/"/g, "")
    const colsMatch = idx.sql.match(/\(([^)]+)\)/)
    const columns = colsMatch ? colsMatch[1].split(",").map((c) => c.trim()) : []
    if (!result[table]) result[table] = []
    result[table].push({
      name: idx.name,
      unique: /create\s+unique\s+index/i.test(idx.sql),
      definition: idx.sql,
      columns,
    })
  }
  return result
}

const buildTriggerMap = () => {
  const result = {}
  for (const trg of Object.values(triggers)) {
    const match = trg.sql.match(/CREATE\s+TRIGGER\s+(\S+)\s+(BEFORE|AFTER|INSTEAD OF)\s+([A-Z\s]+)\s+ON\s+([a-zA-Z0-9_.\"]+)\s+FOR\s+EACH\s+(ROW|STATEMENT)\s+EXECUTE\s+FUNCTION\s+([a-zA-Z0-9_.\"]+)/i)
    if (!match) continue
    const [, name, timing, eventsRaw, tableRaw, level, func] = match
    const table = tableRaw.replace(/"/g, "")
    if (!result[table]) result[table] = []
    result[table].push({
      name,
      timing: timing.toUpperCase(),
      events: eventsRaw.trim().split(/\s+OR\s+/i).map((e) => e.trim().toUpperCase()),
      level: level.toUpperCase(),
      function: func.replace(/"/g, ""),
      description: name.includes("updated_at") ? "Keeps updated_at synchronized via update_updated_at_column()." : null,
    })
  }
  return result
}

const collectPrimaryKeys = (tableDef) => {
  return (tableDef.constraints || [])
    .filter((c) => c.type === "PRIMARY KEY" && c.column)
    .map((c) => c.column)
}

const collectUniqueConstraints = (tableDef) => {
  return (tableDef.constraints || [])
    .filter((c) => c.type === "UNIQUE" && c.column)
    .map((c) => ({ name: c.name, columns: [c.column] }))
}

const collectCheckConstraints = (tableDef) => {
  return (tableDef.constraints || [])
    .filter((c) => c.type === "CHECK")
    .map((c) => ({ name: c.name, definition: null }))
}

const fkEntries = (tableId, tableDef) => {
  const overrides = fkOverrides[tableId] || {}
  return (tableDef.constraints || [])
    .filter((c) => c.type === "FOREIGN KEY" && c.column)
    .map((c) => {
      const override = overrides[c.column]
      return {
        column: c.column,
        references: override ? override.reference : null,
        description: override ? override.description : null,
      }
    })
    .filter((fk) => fk.references)
}

const indexesByTable = buildIndexMap()
const triggersByTable = buildTriggerMap()

const buildColumn = (tableId, column, pkColumns) => {
  const fkOverride = fkOverrides[tableId]?.[column.name]
  return {
    name: column.name,
    type: formatType(column),
    nullable: column.is_nullable === "YES",
    default: column.default || null,
    is_primary: pkColumns.includes(column.name),
    is_foreign: Boolean(fkOverride),
    references: fkOverride ? fkOverride.reference : null,
    note: columnNotes[tableId]?.[column.name] || null,
  }
}

const tablesMin = []
const tablesFull = []

for (const tableDef of Object.values(tables)) {
  const tableId = `${tableDef.schema}.${tableDef.name}`
  const summary = tableSummaries[tableId] || null
  const pkColumns = collectPrimaryKeys(tableDef)
  const columns = tableDef.columns.map((column) => buildColumn(tableId, column, pkColumns))

  tablesMin.push({
    table: tableId,
    summary,
    columns,
  })

  const tableIndexes = indexesByTable[tableId] || []
  const tableTriggers = triggersByTable[tableId] || []
  const uniqueConstraints = collectUniqueConstraints(tableDef)
  const checkConstraints = collectCheckConstraints(tableDef)
  const foreignKeys = fkEntries(tableId, tableDef)

  tablesFull.push({
    table: tableId,
    summary,
    columns,
    primary_key: pkColumns,
    foreign_keys: foreignKeys,
    unique_constraints: uniqueConstraints,
    check_constraints: checkConstraints,
    indexes: tableIndexes,
    triggers: tableTriggers,
  })
}

const functionsMin = []
const functionsFull = []

const parseReturns = (sql) => {
  const match = sql.match(/RETURNS\s+([a-zA-Z0-9_]+)/i)
  return match ? match[1].toLowerCase() : null
}

for (const fnDef of Object.values(functions)) {
  const functionName = `${fnDef.schema}.${fnDef.name}`
  const signature = `${functionName}(${fnDef.arguments || ""})`
  const summary = functionSummaries[functionName]?.summary || null
  const details = functionSummaries[functionName]?.details || null
  const tablesTouched = functionSummaries[functionName]?.tablesTouched || []
  const sideEffects = functionSummaries[functionName]?.sideEffects || []
  const returns = parseReturns(fnDef.sql)

  functionsMin.push({
    function: signature,
    returns,
    summary,
  })

  functionsFull.push({
    function: signature,
    returns,
    summary,
    details,
    tables_touched: tablesTouched,
    side_effects: sideEffects,
    source: fnDef.sql.trim(),
  })
}

const triggerEntries = Object.entries(triggersByTable).flatMap(([table, list]) =>
  list.map((trg) => ({
    table,
    trigger: trg.name,
    function: trg.function,
    timing: trg.timing,
    events: trg.events,
    level: trg.level,
    description: trg.description,
  }))
)

const enumEntries = Object.entries(enums).map(([key, value]) => ({
  name: key,
  labels: value.values || [],
  comment: value.comment || null,
}))

const relations = []
for (const [tableId, overrides] of Object.entries(fkOverrides)) {
  for (const [column, meta] of Object.entries(overrides)) {
    const refParts = meta.reference.split(".")
    const toTable = refParts.slice(0, 2).join(".")
    const toColumn = refParts.slice(2).join(".") || null
    relations.push({
      from_table: tableId,
      from_column: column,
      to_table: toTable,
      to_column: toColumn,
      description: meta.description,
    })
  }
}

const sqlExamples = `-- Maintain contractor catalog
INSERT INTO public.contractor_types (code, name, description)
VALUES ('freelancer', 'Freelancer', 'Individual contractor')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- Register a contractor (updated_at is set by trigger)
INSERT INTO public.contractors (type_id, name, inn, created_by)
VALUES (
  (SELECT id FROM public.contractor_types WHERE code = 'freelancer'),
  'Sole Proprietor John Doe',
  '123456789012',
  '00000000-0000-0000-0000-000000000001'
);

-- Create a project shell for upcoming invoices
INSERT INTO public.projects (code, name, description, created_by)
VALUES ('PAY-001', 'PayHub rollout', 'Internal payment hub rollout', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (code) DO UPDATE SET updated_at = now();

-- Backfill a user profile (normally handle_new_user trigger does this)
INSERT INTO public.user_profiles (id, email, full_name)
VALUES ('00000000-0000-0000-0000-000000000002', 'user@example.com', 'Jane Operator')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- Issue an invoice to a user
INSERT INTO public.invoices (user_id, invoice_number, amount, status, description, due_date)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'INV-2025-0001',
  180000.00,
  'pending',
  'Milestone payment for PAY-001',
  '2025-09-30'
);

-- Mark invoice paid (updated_at is refreshed by trigger)
UPDATE public.invoices
SET status = 'paid'
WHERE invoice_number = 'INV-2025-0001';

-- List most recent invoices for dashboards
SELECT i.invoice_number, i.amount, i.status, i.due_date, up.full_name
FROM public.invoices i
JOIN public.user_profiles up ON up.id = i.user_id
ORDER BY i.created_at DESC
LIMIT 20;

-- Introduce a new internal role
INSERT INTO public.roles (code, name, description)
VALUES ('accountant', 'Accountant', 'Can manage invoices and reconciliation')
ON CONFLICT (code) DO UPDATE SET updated_at = now();

-- Rename a contractor to show trigger-managed timestamps
UPDATE public.contractors
SET name = 'PayHub Delivery LLC'
WHERE inn = '123456789012';

-- Combine contractors with their type for audit
SELECT c.id, c.name, ct.code AS contractor_type, c.updated_at
FROM public.contractors c
JOIN public.contractor_types ct ON ct.id = c.type_id
ORDER BY c.updated_at DESC;
`

const manifestSources = [
  "supabase/exports/tables.json",
  "supabase/exports/indexes.json",
  "supabase/exports/triggers.json",
  "supabase/exports/functions.json",
  "supabase/exports/enums.json",
  "supabase/migrations/prod.sql",
]

const hashFile = (relPath) => {
  const absolute = path.join(root, relPath.replace(/\//g, path.sep))
  if (!fs.existsSync(absolute)) return null
  const buffer = fs.readFileSync(absolute)
  return crypto.createHash("sha256").update(buffer).digest("hex")
}

const manifest = {
  generated_at: new Date().toISOString(),
  source_hashes: manifestSources.reduce((acc, relPath) => {
    acc[relPath] = hashFile(relPath)
    return acc
  }, {}),
}

const writeJson = (fileName, data) => {
  fs.writeFileSync(path.join(aiDir, fileName), JSON.stringify(data, null, 2) + "\n", "utf8")
}

writeJson("ai_tables_min.json", tablesMin)
writeJson("ai_tables_full.json", tablesFull)
writeJson("ai_functions_min.json", functionsMin)
writeJson("ai_functions_full.json", functionsFull)
writeJson("ai_triggers_min.json", triggerEntries)
writeJson("ai_relations.json", relations)
writeJson("ai_enums_min.json", enumEntries)
writeJson("ai_manifest.json", manifest)

fs.writeFileSync(path.join(aiDir, "ai_examples.sql"), sqlExamples, "utf8")
