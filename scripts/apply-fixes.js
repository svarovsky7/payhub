#!/usr/bin/env node

/**
 * Автоматическое применение исправлений в кодовой базе
 *
 * Что делает:
 * 1. Заменяет 'any' на TypeScript типы в approval components
 * 2. Добавляет import для error handler в services
 * 3. Добавляет missing dependencies в React hooks
 */

const fs = require('fs')
const path = require('path')

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// =================================================================
// ЗАДАЧА 1: Замена 'any' на TypeScript типы
// =================================================================

const typeReplacements = [
  {
    file: 'src/services/approval/approvalActions.ts',
    replacements: [
      {
        from: /const stages = approval\.route\?\.stages \|\| \[\]/g,
        to: 'const stages = (approval.route?.stages || []) as WorkflowStage[]'
      },
      {
        from: /stages\.find\(\(s: any\) => s\.order_index/g,
        to: 'stages.find((s: WorkflowStage) => s.order_index'
      }
    ],
    imports: [
      "import type { WorkflowStage, PaymentApproval } from '../../types/approval'"
    ]
  },
  {
    file: 'src/components/admin/ApprovalRoutesTab.tsx',
    replacements: [
      {
        from: /route: any/g,
        to: 'route: ApprovalRoute'
      },
      {
        from: /stage: any/g,
        to: 'stage: WorkflowStage'
      },
      {
        from: /\(s: any\)/g,
        to: '(s: WorkflowStage)'
      }
    ],
    imports: [
      "import type { ApprovalRoute, WorkflowStage } from './approval-routes/types'"
    ]
  }
]

function applyTypeReplacements() {
  log('\n=== ПРИМЕНЕНИЕ TYPESCRIPT ТИПОВ ===', 'blue')

  let filesModified = 0

  for (const config of typeReplacements) {
    const filePath = path.join(process.cwd(), config.file)

    if (!fs.existsSync(filePath)) {
      log(`⚠ Файл не найден: ${config.file}`, 'yellow')
      continue
    }

    let content = fs.readFileSync(filePath, 'utf8')
    let modified = false

    // Добавляем imports если их нет
    for (const importStatement of config.imports || []) {
      if (!content.includes(importStatement)) {
        // Находим последний import и вставляем после него
        const importRegex = /^import .+$/gm
        const imports = content.match(importRegex) || []
        if (imports.length > 0) {
          const lastImport = imports[imports.length - 1]
          content = content.replace(lastImport, `${lastImport}\n${importStatement}`)
          modified = true
        }
      }
    }

    // Применяем замены
    for (const { from, to } of config.replacements) {
      if (content.match(from)) {
        content = content.replace(from, to)
        modified = true
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8')
      log(`✓ Обновлён: ${config.file}`, 'green')
      filesModified++
    } else {
      log(`○ Без изменений: ${config.file}`, 'reset')
    }
  }

  log(`\n✓ Обработано файлов: ${filesModified}/${typeReplacements.length}`, 'green')
}

// =================================================================
// ЗАДАЧА 2: Добавление Error Handler в services
// =================================================================

const serviceFiles = [
  'src/services/paymentOperations.ts',
  'src/services/contractOperations.ts',
  'src/services/materialRequestOperations.ts',
  'src/services/materialNomenclatureOperations.ts',
  'src/services/materialClassOperations.ts',
  'src/services/employeeOperations.ts',
  'src/services/invoice/invoiceCrud.ts',
  'src/services/invoice/invoiceStatus.ts',
  'src/services/approval/approvalQueries.ts',
  'src/services/approval/approvalProcess.ts'
]

function addErrorHandlerImports() {
  log('\n=== ДОБАВЛЕНИЕ ERROR HANDLER ===', 'blue')

  const errorHandlerImport = "import { handleError, parseSupabaseError } from '../lib/errorHandler'"
  const errorHandlerImportInvoice = "import { handleError, parseSupabaseError } from '../../lib/errorHandler'"
  const errorHandlerImportApproval = "import { handleError, parseSupabaseError } from '../../lib/errorHandler'"

  let filesModified = 0

  for (const file of serviceFiles) {
    const filePath = path.join(process.cwd(), file)

    if (!fs.existsSync(filePath)) {
      log(`⚠ Файл не найден: ${file}`, 'yellow')
      continue
    }

    let content = fs.readFileSync(filePath, 'utf8')

    // Определяем правильный путь к errorHandler
    let importToAdd
    if (file.includes('invoice/')) {
      importToAdd = errorHandlerImportInvoice
    } else if (file.includes('approval/')) {
      importToAdd = errorHandlerImportApproval
    } else {
      importToAdd = errorHandlerImport
    }

    // Проверяем есть ли уже import
    if (content.includes('handleError') || content.includes('errorHandler')) {
      log(`○ Уже есть: ${file}`, 'reset')
      continue
    }

    // Находим последний import и добавляем после него
    const importRegex = /^import .+$/gm
    const imports = content.match(importRegex) || []

    if (imports.length > 0) {
      const lastImport = imports[imports.length - 1]
      content = content.replace(lastImport, `${lastImport}\n${importToAdd}`)

      fs.writeFileSync(filePath, content, 'utf8')
      log(`✓ Добавлен import: ${file}`, 'green')
      filesModified++
    } else {
      log(`⚠ Не найдены imports в: ${file}`, 'yellow')
    }
  }

  log(`\n✓ Обработано файлов: ${filesModified}/${serviceFiles.length}`, 'green')
}

// =================================================================
// ЗАДАЧА 3: Исправление React Hooks dependencies
// =================================================================

const hooksFiles = [
  {
    file: 'src/components/admin/ContractorsTab.tsx',
    fixes: [
      {
        hook: 'useEffect',
        deps: "['loadContractors']",
        line: 21
      }
    ]
  },
  {
    file: 'src/components/admin/ApprovalRoutesTab.tsx',
    fixes: [
      {
        hook: 'useEffect',
        deps: "['loadReferences', 'loadRoutes']",
        line: 106
      }
    ]
  },
  {
    file: 'src/components/admin/MaterialNomenclatureTab.tsx',
    fixes: [
      {
        hook: 'useEffect',
        deps: "['loadClasses', 'loadData']",
        line: 102
      }
    ]
  }
]

function fixReactHooksDeps() {
  log('\n=== ИСПРАВЛЕНИЕ REACT HOOKS DEPENDENCIES ===', 'blue')

  log('⚠ Эту задачу лучше выполнить вручную!', 'yellow')
  log('Для каждого файла нужно:', 'yellow')
  log('1. Обернуть функции в useCallback', 'yellow')
  log('2. Добавить правильные dependencies', 'yellow')
  log('3. Или добавить eslint-disable комментарий', 'yellow')
  log('\nФайлы с проблемами:', 'blue')

  hooksFiles.forEach(({ file, fixes }) => {
    log(`  - ${file}:`, 'reset')
    fixes.forEach(fix => {
      log(`    Line ${fix.line}: ${fix.hook} deps: ${fix.deps}`, 'yellow')
    })
  })
}

// =================================================================
// ГЛАВНАЯ ФУНКЦИЯ
// =================================================================

async function main() {
  log('\n╔═══════════════════════════════════════════════════╗', 'blue')
  log('║  АВТОМАТИЧЕСКОЕ ПРИМЕНЕНИЕ ИСПРАВЛЕНИЙ            ║', 'blue')
  log('╚═══════════════════════════════════════════════════╝', 'blue')

  try {
    // 1. TypeScript типы
    applyTypeReplacements()

    // 2. Error Handler
    addErrorHandlerImports()

    // 3. React Hooks (manual)
    fixReactHooksDeps()

    log('\n╔═══════════════════════════════════════════════════╗', 'green')
    log('║  ✓ АВТОМАТИЧЕСКИЕ ИСПРАВЛЕНИЯ ПРИМЕНЕНЫ           ║', 'green')
    log('╚═══════════════════════════════════════════════════╝', 'green')

    log('\nСледующие шаги:', 'blue')
    log('1. Проверьте изменения: git diff', 'yellow')
    log('2. Запустите: npm run lint', 'yellow')
    log('3. Запустите: npm run build', 'yellow')
    log('4. Исправьте React Hooks dependencies вручную', 'yellow')

  } catch (error) {
    log(`\n✗ Ошибка: ${error.message}`, 'red')
    process.exit(1)
  }
}

// Запуск
if (require.main === module) {
  main()
}

module.exports = { applyTypeReplacements, addErrorHandlerImports, fixReactHooksDeps }
