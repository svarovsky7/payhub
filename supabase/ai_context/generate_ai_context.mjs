import fs from "fs"
import path from "path"
import crypto from "crypto"
import { TextDecoder } from "util"

const root = process.cwd()
const exportsDir = path.join(root, "supabase", "exports")
const aiDir = path.join(root, "supabase", "ai_context")

const utf8Decoder = new TextDecoder("utf-8")
const cp866Decoder = new TextDecoder("ibm866")

const readTextWithFallback = (filePath) => {
  const buffer = fs.readFileSync(filePath)
  let text = utf8Decoder.decode(buffer)
  if (text.includes('�')) {
    text = cp866Decoder.decode(buffer)
  }
  return text
}

const readJson = (filePath) => JSON.parse(readTextWithFallback(filePath))

const tables = readJson(path.join(exportsDir, "tables.json"))
const indexes = readJson(path.join(exportsDir, "indexes.json"))
const triggers = readJson(path.join(exportsDir, "triggers.json"))
const functions = readJson(path.join(exportsDir, "functions.json"))
const enumsPath = path.join(exportsDir, "enums.json")
const enums = fs.existsSync(enumsPath) ? readJson(enumsPath) : {}

const tableSummaries = {
  "public.contractor_types": "Dictionary of contractor categories used to classify payments and obligations.",
  "public.contractors": "Registered contractors with type, tax id and authoring user.",
  "public.invoice_statuses": "Invoice workflow statuses used to drive document state transitions.",
  "public.invoice_types": "Catalog of invoice types (services, materials, subscriptions, etc.).",
  "public.invoices": "Outbound invoices tracked by PayHub with monetary breakdown and workflow links.",
  "public.projects": "Projects that group invoices and contractors for reporting.",
  "public.roles": "Access roles managed inside PayHub.",
  "public.user_profiles": "User profile mirror for Supabase auth users.",
  "public.user_projects": "Mapping table granting users access to projects.",
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
    description: "Optional narrative description.",
    due_date: "Payment due date.",
    created_at: "Creation timestamp.",
    updated_at: "Auto refreshed timestamp.",
    invoice_date: "Calendar date printed on the invoice.",
    payer_id: "Contractor acting as payer.",
    supplier_id: "Contractor acting as supplier.",
    project_id: "Associated project for reporting.",
    invoice_type_id: "Reference to invoice_types.",
    amount_with_vat: "Invoice total including VAT.",
    vat_rate: "VAT rate applied (percent).",
    vat_amount: "VAT amount derived from totals.",
    amount_without_vat: "Invoice total excluding VAT.",
    delivery_days: "Number of days for delivery after payment.",
    delivery_days_type: "Delivery day interpretation (working/calendar).",
    preliminary_delivery_date: "Projected delivery date computed from payment terms.",
    status_id: "Reference to invoice_statuses.",
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
  "public.invoice_statuses": {
    id: "Surrogate status id.",
    code: "Unique status code for UI/API.",
    name: "Status label.",
    description: "Optional status guidance.",
    sort_order: "Ordering for UI sequences.",
    color: "Optional badge color token.",
    created_at: "Creation timestamp.",
    updated_at: "Auto refreshed timestamp.",
  },
  "public.invoice_types": {
    id: "Surrogate type id.",
    code: "Unique type code.",
    name: "Type label.",
    description: "Optional details.",
    created_at: "Creation timestamp.",
    updated_at: "Auto refreshed timestamp.",
  },
  "public.user_projects": {
    id: "Relation surrogate key.",
    user_id: "Supabase user assigned to the project.",
    project_id: "Project being granted to the user.",
    created_at: "Creation timestamp.",
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
    payer_id: {
      reference: "public.contractors.id",
      description: "Payer contractor linked to the invoice.",
    },
    supplier_id: {
      reference: "public.contractors.id",
      description: "Supplier contractor linked to the invoice.",
    },
    project_id: {
      reference: "public.projects.id",
      description: "Project that groups the invoice.",
    },
    invoice_type_id: {
      reference: "public.invoice_types.id",
      description: "Invoice type catalog reference.",
    },
    status_id: {
      reference: "public.invoice_statuses.id",
      description: "Workflow status from invoice_statuses.",
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
  "public.user_projects": {
    user_id: {
      reference: "auth.users.id",
      description: "User receiving project access.",
    },
    project_id: {
      reference: "public.projects.id",
      description: "Project assigned to the user.",
    },
  },
}

const functionSummaries = {
  "public.calculate_vat_amounts": {
    summary: "Trigger helper that recalculates vat_amount and amount_without_vat before persisting invoices.",
    details: "Runs as BEFORE INSERT/UPDATE trigger on public.invoices to derive vat_amount and amount_without_vat based on amount_with_vat and vat_rate.",
    tablesTouched: ["public.invoices"],
    sideEffects: ["SET NEW.vat_amount", "SET NEW.amount_without_vat"],
  },
  "public.delete_contractor_type": {
    summary: "Safely deletes a contractor type if no contractors depend on it.",
    details: "Counts rows in public.contractors referencing the type and returns JSON describing the result or blocking deletion.",
    tablesTouched: ["public.contractors", "public.contractor_types"],
    sideEffects: ["DELETE"],
  },
  "public.delete_project": {
    summary: "Removes a project and cleans up user assignments in one call.",
    details: "Deletes rows from public.user_projects for the project, then deletes the project itself; returns boolean indicating success.",
    tablesTouched: ["public.user_projects", "public.projects"],
    sideEffects: ["DELETE"],
  },
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
    sideEffects: ["SET NEW.updated_at"],
  },
}

﻿const formatType = (column) => {
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
    case "date":
      return "date"
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
    note: columnNotes[tableId]?.[column.name] ?? column.comment ?? null,
  }
}


const tablesMin = []
const tablesFull = []

for (const tableDef of Object.values(tables)) {
  const tableId = `${tableDef.schema}.${tableDef.name}`
  const summary = tableSummaries[tableId] || tableDef.comment || null
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

const sqlExamples = `-- Catalog seed data
INSERT INTO public.invoice_statuses (code, name, description, sort_order)
VALUES
  ('draft', 'Draft', 'New invoice waiting for details', 10),
  ('pending', 'Pending Payment', 'Issued to customer, awaiting funds', 20),
  ('paid', 'Paid', 'Payment received and reconciled', 30)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.invoice_types (code, name, description)
VALUES
  ('services', 'Services', 'Time & materials or professional services'),
  ('subscription', 'Subscription', 'Recurring SaaS or retainer billing')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO public.contractor_types (code, name, description)
VALUES ('freelancer', 'Freelancer', 'Individual contractor')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- Core actors
INSERT INTO public.contractors (type_id, name, inn, created_by)
VALUES
  ((SELECT id FROM public.contractor_types WHERE code = 'freelancer'), 'Sole Proprietor John Doe', '123456789012', '00000000-0000-0000-0000-000000000001'),
  ((SELECT id FROM public.contractor_types WHERE code = 'freelancer'), 'PayHub Delivery LLC', '774512345678', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (inn) DO NOTHING;

INSERT INTO public.projects (code, name, description, created_by)
VALUES ('PAY-001', 'PayHub rollout', 'Internal payment hub rollout', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (code) DO UPDATE SET updated_at = now();

INSERT INTO public.user_profiles (id, email, full_name)
VALUES ('00000000-0000-0000-0000-000000000002', 'user@example.com', 'Jane Operator')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- Attach a supporting document
INSERT INTO public.attachments (id, original_name, storage_path, size_bytes, mime_type, created_by)
VALUES (
  gen_random_uuid(),
  'contract.pdf',
  'invoices/contracts/contract.pdf',
  524288,
  'application/pdf',
  '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (storage_path) DO NOTHING;

-- Invoice write path (calculate_vat_amounts trigger populates VAT fields)
INSERT INTO public.invoices (
  user_id,
  invoice_number,
  description,
  invoice_date,
  due_date,
  payer_id,
  supplier_id,
  project_id,
  invoice_type_id,
  status_id,
  amount_with_vat,
  vat_rate,
  delivery_days,
  delivery_days_type
)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'INV-2025-0001',
  'Milestone payment for PAY-001',
  '2025-09-15',
  '2025-09-30',
  (SELECT id FROM public.contractors WHERE inn = '123456789012'),
  (SELECT id FROM public.contractors WHERE inn = '774512345678'),
  (SELECT id FROM public.projects WHERE code = 'PAY-001'),
  (SELECT id FROM public.invoice_types WHERE code = 'services'),
  (SELECT id FROM public.invoice_statuses WHERE code = 'pending'),
  180000.00,
  20,
  5,
  'working'
)
RETURNING id AS invoice_id;

-- Link invoice to the uploaded document
INSERT INTO public.invoice_attachments (invoice_id, attachment_id)
VALUES (
  (SELECT id FROM public.invoices WHERE invoice_number = 'INV-2025-0001'),
  (SELECT id FROM public.attachments WHERE storage_path = 'invoices/contracts/contract.pdf')
)
ON CONFLICT (invoice_id, attachment_id) DO NOTHING;

-- Trigger demo: adjust totals, updated_at maintained automatically
UPDATE public.invoices
SET amount_with_vat = 240000.00, vat_rate = 20
WHERE invoice_number = 'INV-2025-0001';

-- Use catalog function to attempt safe deletion (returns JSON message)
SELECT public.delete_contractor_type(type_id_param => (SELECT id FROM public.contractor_types WHERE code = 'freelancer'));

-- Clean up a project along with user bindings
SELECT public.delete_project(project_id_param => (SELECT id FROM public.projects WHERE code = 'PAY-001'));

-- Analytical join with status, type and counterparties
SELECT i.invoice_number,
       i.invoice_date,
       i.amount_with_vat,
       i.vat_amount,
       s.code   AS status_code,
       t.code   AS invoice_type_code,
       payer.name    AS payer_name,
       supplier.name AS supplier_name
FROM public.invoices i
JOIN public.invoice_statuses s ON s.id = i.status_id
LEFT JOIN public.invoice_types t ON t.id = i.invoice_type_id
LEFT JOIN public.contractors payer ON payer.id = i.payer_id
LEFT JOIN public.contractors supplier ON supplier.id = i.supplier_id
ORDER BY i.created_at DESC
LIMIT 20;

-- Updated_at audit trigger showcase on contractors
UPDATE public.contractors
SET name = 'PayHub Delivery & Logistics LLC'
WHERE inn = '774512345678';
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
