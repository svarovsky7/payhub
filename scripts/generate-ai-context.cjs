const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootDir = process.cwd();
const exportsDir = path.join(rootDir, 'supabase', 'exports');
const contextDir = path.join(rootDir, 'supabase', 'ai_context');

function readJson(filename) {
  const filePath = path.join(exportsDir, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const tables = readJson('tables.json');
const indexes = readJson('indexes.json');
const triggers = readJson('triggers.json');
const functionsData = readJson('functions.json');

fs.mkdirSync(contextDir, { recursive: true });

const descriptionOverrides = {
  'public.contractor_types': 'Справочник категорий контрагентов.',
  'public.contractors': 'Реестр контрагентов, связанных со счетами и проектами.',
  'public.invoice_payments': 'Связующая таблица между счетами и платежами с распределением сумм.',
  'public.invoice_statuses': 'Справочник статусов жизненного цикла счетов.',
  'public.invoice_types': 'Справочник типов счетов (например, услуги или материалы).',
  'public.invoices': 'Исходящие счета, создаваемые в PayHub.',
  'public.payment_approvals': 'Экземпляры согласования платежей по маршрутам.',
  'public.payment_statuses': 'Справочник статусов обработки платежей.',
  'public.payment_types': 'Справочник типов платежей.',
  'public.payments': 'Реестр поступивших платежей и их параметров.',
  'public.projects': 'Проекты для группировки счетов и контрагентов.',
  'public.roles': 'Роли доступа внутри PayHub.',
  'public.user_profiles': 'Профили пользователей (зеркало auth.users).',
  'public.user_projects': 'Назначения пользователей на проекты.',
};

const columnNoteOverrides = {
  'public.invoices.invoice_number': 'Внешний номер счета, отображаемый клиенту.',
  'public.payments.payment_number': 'Последовательный номер платежа.',
  'public.projects.code': 'Уникальный код проекта для интеграций.',
};

const fkOverrides = {
  'public.approval_routes.invoice_type_id': 'public.invoice_types.id',
  'public.approval_steps.payment_approval_id': 'public.payment_approvals.id',
  'public.approval_steps.stage_id': 'public.workflow_stages.id',
  'public.approval_steps.acted_by': 'auth.users.id',
  'public.attachments.created_by': 'auth.users.id',
  'public.contractors.created_by': 'auth.users.id',
  'public.invoice_attachments.attachment_id': 'public.attachments.id',
  'public.invoice_attachments.invoice_id': 'public.invoices.id',
  'public.invoice_payments.invoice_id': 'public.invoices.id',
  'public.invoice_payments.payment_id': 'public.payments.id',
  'public.invoices.user_id': 'auth.users.id',
  'public.invoices.invoice_type_id': 'public.invoice_types.id',
  'public.invoices.payer_id': 'public.contractors.id',
  'public.invoices.supplier_id': 'public.contractors.id',
  'public.invoices.project_id': 'public.projects.id',
  'public.invoices.status_id': 'public.invoice_statuses.id',
  'public.payment_approvals.payment_id': 'public.payments.id',
  'public.payment_approvals.route_id': 'public.approval_routes.id',
  'public.payment_approvals.status_id': 'public.payment_statuses.id',
  'public.payment_attachments.attachment_id': 'public.attachments.id',
  'public.payment_attachments.payment_id': 'public.payments.id',
  'public.payments.created_by': 'auth.users.id',
  'public.payments.invoice_id': 'public.invoices.id',
  'public.payments.payment_type_id': 'public.payment_types.id',
  'public.payments.status_id': 'public.payment_statuses.id',
  'public.projects.created_by': 'auth.users.id',
  'public.user_profiles.id': 'auth.users.id',
  'public.user_profiles.role_id': 'public.roles.id',
  'public.user_projects.user_id': 'auth.users.id',
  'public.user_projects.project_id': 'public.projects.id',
  'public.workflow_stages.role_id': 'public.roles.id',
  'public.workflow_stages.route_id': 'public.approval_routes.id'
};

const relationDescriptions = {
  'public.approval_routes.invoice_type_id': 'Маршрут применяется к определённому типу счета.',
  'public.approval_steps.payment_approval_id': 'Шаг относится к конкретному процессу согласования платежа.',
  'public.approval_steps.stage_id': 'Ссылка на этап маршрута.',
  'public.approval_steps.acted_by': 'Пользователь, выполнивший действие на шаге.',
  'public.attachments.created_by': 'Автор загрузки файла (auth.users).',
  'public.contractors.created_by': 'Пользователь, создавший контрагента.',
  'public.contractors.type_id': 'Категория контрагента.',
  'public.invoice_attachments.attachment_id': 'Прикреплённый файл.',
  'public.invoice_attachments.invoice_id': 'Счет, к которому прикреплён файл.',
  'public.invoice_payments.invoice_id': 'Счет, который покрывает платеж.',
  'public.invoice_payments.payment_id': 'Платеж, распределенный на счет.',
  'public.invoices.invoice_type_id': 'Тип счета.',
  'public.invoices.payer_id': 'Контрагент-плательщик.',
  'public.invoices.project_id': 'Проект, к которому относится счет.',
  'public.invoices.status_id': 'Текущий статус счета.',
  'public.invoices.supplier_id': 'Контрагент-поставщик.',
  'public.invoices.user_id': 'Автор счета (auth.users).',
  'public.payment_approvals.payment_id': 'Платеж, проходящий согласование.',
  'public.payment_approvals.route_id': 'Маршрут согласования платежа.',
  'public.payment_approvals.status_id': 'Статус процесса согласования.',
  'public.payment_attachments.attachment_id': 'Прикреплённый файл платежа.',
  'public.payment_attachments.payment_id': 'Платеж, к которому прикреплен файл.',
  'public.payments.created_by': 'Пользователь, зарегистрировавший платеж.',
  'public.payments.invoice_id': 'Счет, который оплачивается.',
  'public.payments.payment_type_id': 'Тип платежа.',
  'public.payments.status_id': 'Статус платежа.',
  'public.projects.created_by': 'Пользователь, создавший проект.',
  'public.user_profiles.id': 'Идентификатор auth.users.',
  'public.user_profiles.role_id': 'Назначенная роль доступа.',
  'public.user_projects.project_id': 'Проект, к которому назначен пользователь.',
  'public.user_projects.user_id': 'Пользователь с доступом к проекту.',
  'public.workflow_stages.role_id': 'Роль ответственного за этап.',
  'public.workflow_stages.route_id': 'Маршрут, которому принадлежит этап.'
};

const triggerDescriptions = name => {
  if (/update_.*_updated_at/.test(name)) {
    return 'Автообновление updated_at через update_updated_at_column().';
  }
  if (name === 'calculate_vat_on_invoice') {
    return 'Перед вставкой или обновлением пересчитывает суммы НДС через calculate_vat_amounts().';
  }
  return 'Служебный триггер.';
};

const functionsMeta = {
  'public.calculate_vat_amounts()': {
    summary: 'Рассчитывает суммы НДС для строки счета перед сохранением.',
    details: 'Работает в триггере calculate_vat_on_invoice до INSERT/UPDATE в public.invoices и обновляет NEW.vat_amount и NEW.amount_without_vat.',
    tables: ['public.invoices'],
    sideEffects: ['Обновляет NEW.vat_amount', 'Обновляет NEW.amount_without_vat']
  },
  'public.delete_contractor_type(type_id_param integer)': {
    summary: 'Удаляет тип контрагента, если от него не зависят записи.',
    details: 'Проверяет наличие связанных контрагентов и либо возвращает ошибку, либо удаляет запись из public.contractor_types.',
    tables: ['public.contractors', 'public.contractor_types'],
    sideEffects: ['DELETE из public.contractor_types']
  },
  'public.delete_project(project_id_param integer)': {
    summary: 'Удаляет проект и связанные назначения пользователей.',
    details: 'Сначала очищает public.user_projects, затем удаляет строку из public.projects и возвращает флаг успеха.',
    tables: ['public.user_projects', 'public.projects'],
    sideEffects: ['DELETE из public.user_projects', 'DELETE из public.projects']
  },
  'public.handle_new_user()': {
    summary: 'Создаёт профиль пользователя при появлении записи в auth.users.',
    details: 'Вставляет строку в public.user_profiles, подставляя email и имя из raw_user_meta_data.',
    tables: ['public.user_profiles'],
    sideEffects: ['INSERT в public.user_profiles']
  },
  'public.update_updated_at_column()': {
    summary: 'Устанавливает NEW.updated_at в текущий момент времени.',
    details: 'Используется триггерами BEFORE UPDATE для обновления поля updated_at в различных таблицах.',
    tables: [],
    sideEffects: ['Обновляет NEW.updated_at']
  }
};

function hasCyrillic(text) {
  return /[\u0400-\u04FF]/.test(text);
}

function normalizeType(column) {
  const type = column.data_type;
  if (!type) return null;
  if (type === 'character varying') {
    return column.max_length ? `varchar(${column.max_length})` : 'varchar';
  }
  if (type === 'numeric') {
    if (column.numeric_precision && column.numeric_scale !== null && column.numeric_scale !== undefined) {
      return `numeric(${column.numeric_precision},${column.numeric_scale})`;
    }
    if (column.numeric_precision) {
      return `numeric(${column.numeric_precision})`;
    }
    return 'numeric';
  }
  if (type === 'timestamp with time zone') {
    return 'timestamptz';
  }
  if (type === 'timestamp without time zone') {
    return 'timestamp';
  }
  if (type === 'integer' && column.numeric_precision) {
    return 'integer';
  }
  return type;
}

function resolveForeignKey(tableKey, columnName, column) {
  const pattern = column && column.comment ? column.comment.match(/(public|auth)\.[a-z_]+\.[a-z_]+/i) : null;
  if (pattern) {
    return pattern[0].toLowerCase();
  }
  return fkOverrides[`${tableKey}.${columnName}`] || null;
}

function extractConstraints(tableKey, table) {
  const primaryKeySet = new Set();
  const fkMap = new Map();
  const uniqueMap = new Map();
  const checkMap = new Map();

  for (const constraint of table.constraints || []) {
    const column = constraint.column || null;
    switch (constraint.type) {
      case 'PRIMARY KEY':
        if (column) {
          primaryKeySet.add(column);
        }
        break;
      case 'FOREIGN KEY': {
        if (!column) break;
        if (!fkMap.has(column)) {
          const colDef = table.columns.find(c => c.name === column);
          const references = resolveForeignKey(tableKey, column, colDef);
          fkMap.set(column, references);
        }
        break;
      }
      case 'UNIQUE':
        if (!uniqueMap.has(constraint.name)) {
          uniqueMap.set(constraint.name, new Set());
        }
        if (column) {
          uniqueMap.get(constraint.name).add(column);
        }
        break;
      case 'CHECK':
        if (!checkMap.has(constraint.name)) {
          checkMap.set(constraint.name, { name: constraint.name, definition: null });
        }
        break;
      default:
        break;
    }
  }

  const foreignKeys = Array.from(fkMap.entries()).map(([column, references]) => ({
    column,
    references
  }));

  const uniqueConstraints = Array.from(uniqueMap.entries()).map(([name, cols]) => ({
    name,
    columns: Array.from(cols)
  }));

  const checkConstraints = Array.from(checkMap.values());

  return {
    primaryKeySet,
    foreignKeys,
    uniqueConstraints,
    checkConstraints
  };
}

function buildIndexMap(indexData) {
  const map = {};
  Object.values(indexData).forEach(entry => {
    const match = entry.sql.match(/ON\s+([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/);
    if (!match) return;
    const tableKey = `${match[1]}.${match[2]}`;
    const columnsMatch = entry.sql.match(/\(([^)]+)\)/);
    const columns = columnsMatch ? columnsMatch[1].split(',').map(col => col.trim().replace(/\"/g, '')) : [];
    if (!map[tableKey]) {
      map[tableKey] = [];
    }
    map[tableKey].push({
      name: entry.name,
      unique: !!entry.is_unique || /UNIQUE/i.test(entry.sql),
      definition: entry.sql,
      columns
    });
  });
  return map;
}

function buildTriggerMap(triggerData) {
  const map = {};
  Object.entries(triggerData).forEach(([key, entry]) => {
    const match = entry.sql.match(/ON\s+([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/);
    if (!match) return;
    const tableKey = `${match[1]}.${match[2]}`;
    const timingMatch = entry.sql.match(/(BEFORE|AFTER|INSTEAD OF)/i);
    const eventSection = entry.sql.match(/(BEFORE|AFTER|INSTEAD OF)\s+(.+?)\s+ON/i);
    const events = eventSection ? eventSection[2].split(/\s+OR\s+/i).map(evt => evt.trim().toUpperCase()) : [];
    const level = entry.sql.includes('FOR EACH ROW') ? 'ROW' : entry.sql.includes('FOR EACH STATEMENT') ? 'STATEMENT' : null;
    const fnMatch = entry.sql.match(/EXECUTE FUNCTION\s+([a-zA-Z0-9_.]+)/i);
    const rawFunction = fnMatch ? fnMatch[1] : null;
    const functionName = rawFunction && rawFunction.includes('.') ? rawFunction : rawFunction ? `public.${rawFunction}` : null;
    if (!map[tableKey]) {
      map[tableKey] = [];
    }
    map[tableKey].push({
      name: entry.name,
      timing: timingMatch ? timingMatch[0].toUpperCase() : null,
      events,
      level,
      function: functionName,
      description: triggerDescriptions(entry.name)
    });
  });
  return map;
}

const indexMap = buildIndexMap(indexes);
const triggerMap = buildTriggerMap(triggers);
const tableKeys = Object.keys(tables).sort();

const tableAnalyses = tableKeys.map(tableKey => {
  const table = tables[tableKey];
  const summary = descriptionOverrides[tableKey] || table.comment || `Служебная таблица ${tableKey}.`;
  const constraints = extractConstraints(tableKey, table);
  const fkByColumn = new Map(constraints.foreignKeys.map(fk => [fk.column, fk.references]));
  const columns = table.columns.map(column => {
    const type = normalizeType(column);
    const references = fkByColumn.get(column.name) || null;
    const noteOverride = columnNoteOverrides[`${tableKey}.${column.name}`];
    let note = noteOverride || null;
    if (!note && column.comment && hasCyrillic(column.comment)) {
      note = column.comment;
    }
    return {
      name: column.name,
      type,
      nullable: column.is_nullable !== 'NO',
      default: column.default ?? null,
      is_primary: constraints.primaryKeySet.has(column.name),
      is_foreign: !!references,
      references,
      note: note || null
    };
  });

  const foreignKeys = constraints.foreignKeys
    .filter(fk => fk.references)
    .map(fk => ({
      column: fk.column,
      references: fk.references,
      description: relationDescriptions[`${tableKey}.${fk.column}`] || null
    }));

  const indexes = (indexMap[tableKey] || []).sort((a, b) => a.name.localeCompare(b.name));
  const triggers = (triggerMap[tableKey] || []).sort((a, b) => a.name.localeCompare(b.name));

  return {
    table: tableKey,
    summary,
    columns,
    primaryKey: Array.from(constraints.primaryKeySet),
    foreignKeys,
    uniqueConstraints: constraints.uniqueConstraints,
    checkConstraints: constraints.checkConstraints,
    indexes,
    triggers
  };
});

const tablesMin = tableAnalyses.map(entry => ({
  table: entry.table,
  summary: entry.summary,
  columns: entry.columns
}));

const tablesFull = tableAnalyses.map(entry => ({
  table: entry.table,
  summary: entry.summary,
  columns: entry.columns,
  primary_key: entry.primaryKey,
  foreign_keys: entry.foreignKeys,
  unique_constraints: entry.uniqueConstraints,
  check_constraints: entry.checkConstraints,
  indexes: entry.indexes,
  triggers: entry.triggers
}));

function buildRelations(entries) {
  const result = [];
  const seen = new Set();
  entries.forEach(entry => {
    entry.foreignKeys.forEach(fk => {
      const key = `${entry.table}.${fk.column}`;
      if (seen.has(key)) return;
      seen.add(key);
      if (!fk.references) return;
      const parts = fk.references.split('.');
      if (parts.length < 3) return;
      result.push({
        from_table: entry.table,
        from_column: fk.column,
        to_table: `${parts[0]}.${parts[1]}`,
        to_column: parts[2],
        description: fk.description
      });
    });
  });
  return result.sort((a, b) => {
    if (a.from_table === b.from_table) {
      return a.from_column.localeCompare(b.from_column);
    }
    return a.from_table.localeCompare(b.from_table);
  });
}

const relations = buildRelations(tableAnalyses);

function parseReturnType(sql) {
  const match = sql.match(/RETURNS\s+([a-zA-Z0-9_\s]+)/i);
  if (!match) return null;
  return match[1].trim().split(/\s+/)[0];
}

function buildFunctions(functionsData) {
  const min = [];
  const full = [];
  Object.entries(functionsData).forEach(([signature, fn]) => {
    const meta = functionsMeta[signature] || {
      summary: 'Описание функции пока не заполнено.',
      details: null,
      tables: [],
      sideEffects: []
    };
    const returns = parseReturnType(fn.sql) || null;
    min.push({
      function: signature,
      returns,
      summary: meta.summary
    });
    full.push({
      function: signature,
      returns,
      summary: meta.summary,
      details: meta.details || meta.summary,
      tables_touched: meta.tables,
      side_effects: meta.sideEffects,
      source: fn.sql.trim()
    });
  });
  min.sort((a, b) => a.function.localeCompare(b.function));
  full.sort((a, b) => a.function.localeCompare(b.function));
  return { min, full };
}

const { min: functionsMin, full: functionsFull } = buildFunctions(functionsData);

function buildTriggersList(triggerMap) {
  const list = [];
  Object.entries(triggerMap).forEach(([table, triggers]) => {
    triggers.forEach(trigger => {
      list.push({
        table,
        trigger: trigger.name,
        function: trigger.function,
        timing: trigger.timing,
        events: trigger.events,
        level: trigger.level,
        description: trigger.description
      });
    });
  });
  return list.sort((a, b) => {
    if (a.table === b.table) {
      return a.trigger.localeCompare(b.trigger);
    }
    return a.table.localeCompare(b.table);
  });
}

const triggersList = buildTriggersList(triggerMap);

function writeJson(filename, data) {
  const filePath = path.join(contextDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

const generatedAt = new Date().toISOString();
const sourceFiles = [
  'supabase/exports/tables.json',
  'supabase/exports/indexes.json',
  'supabase/exports/triggers.json',
  'supabase/exports/functions.json',
  'supabase/exports/enums.json',
  'supabase/migrations/prod.sql'
];
const sourceHashes = {};
sourceFiles.forEach(relPath => {
  const absPath = path.join(rootDir, relPath.replace(/\//g, path.sep));
  if (fs.existsSync(absPath)) {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
    sourceHashes[relPath] = hash;
  } else {
    sourceHashes[relPath] = null;
  }
});

const examples = [
  `-- Справочники статусов и типов счетов\nINSERT INTO public.invoice_statuses (code, name, description, sort_order)\nVALUES\n  ('draft', 'Черновик', 'Счет готовится к отправке', 10),\n  ('pending', 'Ожидает оплату', 'Выставлен клиенту, деньги ещё не поступили', 20),\n  ('paid', 'Оплачен', 'Средства поступили и распределены', 30)\nON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;\n\nINSERT INTO public.invoice_types (code, name, description)\nVALUES\n  ('services', 'Услуги', 'Оплата работ или услуг'),\n  ('materials', 'Материалы', 'Поставка материалов и ТМЦ')\nON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;`,
  `-- Базовые справочники для платежей\nINSERT INTO public.payment_statuses (code, name, description)\nVALUES\n  ('draft', 'Черновик', 'Платёж создан, но ещё не проведён'),\n  ('processing', 'В обработке', 'Проверяется и согласуется'),\n  ('settled', 'Проведён', 'Платёж успешно закрыт')\nON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;\n\nINSERT INTO public.payment_types (code, name)\nVALUES\n  ('wire', 'Банковский перевод'),\n  ('cashless', 'Безналичный платёж')\nON CONFLICT (code) DO NOTHING;`,
  `-- Создание типа и двух контрагентов\nINSERT INTO public.contractor_types (code, name, description)\nVALUES ('vendor', 'Поставщик', 'Контрагент, предоставляющий товары или услуги')\nON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;\n\nINSERT INTO public.contractors (type_id, name, inn, created_by)\nVALUES\n  ((SELECT id FROM public.contractor_types WHERE code = 'vendor'), 'ООО "ПэйХаб Поставка"', '7712345678', '00000000-0000-0000-0000-000000000001'),\n  ((SELECT id FROM public.contractor_types WHERE code = 'vendor'), 'ИП Петров И.И.', '503456789012', '00000000-0000-0000-0000-000000000001')\nON CONFLICT (inn) DO NOTHING;`,
  `-- Новый проект для учета операций\nINSERT INTO public.projects (code, name, description, created_by)\nVALUES ('PH-001', 'Внедрение PayHub', 'Проект по запуску внутреннего платёжного центра', '00000000-0000-0000-0000-000000000001')\nON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description, updated_at = now();`,
  `-- Создание счета: триггер calculate_vat_on_invoice заполнит суммы НДС\nINSERT INTO public.invoices (\n  user_id, invoice_number, invoice_date, due_date,\n  payer_id, supplier_id, project_id,\n  invoice_type_id, amount_with_vat, vat_rate, status_id\n)\nVALUES (\n  '00000000-0000-0000-0000-000000000001',\n  'INV-2025-001', CURRENT_DATE, CURRENT_DATE + INTERVAL '10 days',\n  (SELECT id FROM public.contractors WHERE inn = '7712345678'),\n  (SELECT id FROM public.contractors WHERE inn = '503456789012'),\n  (SELECT id FROM public.projects WHERE code = 'PH-001'),\n  (SELECT id FROM public.invoice_types WHERE code = 'services'),\n  118000, 20,\n  (SELECT id FROM public.invoice_statuses WHERE code = 'pending')\n)\nRETURNING id;`,
  `-- Обновление суммы счета: обновит и updated_at, и суммы НДС\nUPDATE public.invoices\nSET amount_with_vat = 236000\nWHERE invoice_number = 'INV-2025-001';`,
  `-- Фиксация платежа и автоматическое заполнение updated_at\nINSERT INTO public.payments (\n  invoice_id, payment_number, payment_date, amount,\n  description, payment_type_id, status_id, created_by\n)\nVALUES (\n  (SELECT id FROM public.invoices WHERE invoice_number = 'INV-2025-001'),\n  nextval('payment_number_seq'),\n  CURRENT_DATE,\n  118000,\n  'Первый транш по договору INV-2025-001',\n  (SELECT id FROM public.payment_types WHERE code = 'wire'),\n  (SELECT id FROM public.payment_statuses WHERE code = 'processing'),\n  '00000000-0000-0000-0000-000000000001'\n)\nRETURNING id;`,
  `-- Распределение платежа на счет\nINSERT INTO public.invoice_payments (invoice_id, payment_id, allocated_amount)\nVALUES (\n  (SELECT id FROM public.invoices WHERE invoice_number = 'INV-2025-001'),\n  (SELECT id FROM public.payments ORDER BY created_at DESC LIMIT 1),\n  118000\n)\nON CONFLICT (invoice_id, payment_id) DO UPDATE SET allocated_amount = EXCLUDED.allocated_amount;`,
  `-- Настройка маршрута и этапа согласования платежей\nINSERT INTO public.approval_routes (id, invoice_type_id, name, is_active)\nVALUES (1, (SELECT id FROM public.invoice_types WHERE code = 'services'), 'Согласование платежей по услугам', true)\nON CONFLICT (id) DO UPDATE SET is_active = EXCLUDED.is_active;\n\nINSERT INTO public.workflow_stages (id, route_id, order_index, role_id, name)\nVALUES (1, 1, 1, (SELECT id FROM public.roles LIMIT 1), 'Финансовый контроль')\nON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;`,
  `-- Запуск согласования платежа и фиксация действия по этапу\nINSERT INTO public.payment_approvals (payment_id, route_id, status_id)\nVALUES (\n  (SELECT id FROM public.payments ORDER BY created_at DESC LIMIT 1),\n  1,\n  (SELECT id FROM public.payment_statuses WHERE code = 'processing')\n)\nON CONFLICT (payment_id) DO NOTHING;\n\nINSERT INTO public.approval_steps (payment_approval_id, stage_id, action, acted_by, acted_at, comment)\nVALUES (\n  (SELECT id FROM public.payment_approvals ORDER BY created_at DESC LIMIT 1),\n  1,\n  'approve',\n  '00000000-0000-0000-0000-000000000001',\n  now(),\n  'Согласовано в один клик'\n);`,
  `-- Примеры вызова бизнес-функций\nSELECT public.delete_contractor_type(type_id_param := (SELECT id FROM public.contractor_types WHERE code = 'vendor'));\nSELECT public.delete_project(project_id_param := (SELECT id FROM public.projects WHERE code = 'PH-001'));\n-- Функция public.calculate_vat_amounts() вызывается триггером calculate_vat_on_invoice и вручную не запускается.`
];

const manifest = {
  generated_at: generatedAt,
  source_hashes: sourceHashes
};

writeJson('ai_tables_min.json', tablesMin);
writeJson('ai_tables_full.json', tablesFull);
writeJson('ai_relations.json', relations);
writeJson('ai_functions_min.json', functionsMin);
writeJson('ai_functions_full.json', functionsFull);
writeJson('ai_triggers_min.json', triggersList);
writeJson('ai_enums_min.json', []);
writeJson('ai_manifest.json', manifest);

fs.writeFileSync(path.join(contextDir, 'ai_examples.sql'), examples.join('\n\n') + '\n', 'utf8');
