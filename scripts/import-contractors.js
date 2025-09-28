/**
 * Временный скрипт для импорта контрагентов из CSV файла
 * Использование: node scripts/import-contractors.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Настройки подключения к Supabase
const supabaseUrl = 'http://31.128.51.210:8001';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImlhdCI6MTc1ODQyNzQzNCwibmJmIjoxNzU4NDI3Mzc0LCJleHAiOjIwNzM3ODc0MzR9.N80dpZTFLMX9DQOqeKdTcwwa4pc8ZMNXTyFwCKeQ__4';

const supabase = createClient(supabaseUrl, supabaseKey);

// Функция для обработки ИНН в научной нотации
function processINN(innValue) {
  // Если значение содержит 'E+', это научная нотация
  if (String(innValue).includes('E+') || String(innValue).includes('e+')) {
    // Преобразуем научную нотацию в обычное число
    const num = parseFloat(innValue);
    // Преобразуем в строку без научной нотации
    return Math.round(num).toString();
  }

  // Убираем все пробелы и нечисловые символы кроме цифр
  return String(innValue).replace(/[^\d]/g, '');
}

// Функция для очистки названия компании
function cleanCompanyName(name) {
  // Убираем BOM, кавычки, лишние пробелы и специальные символы
  return name
    .replace(/^\uFEFF/, '') // Убираем BOM (Byte Order Mark)
    .replace(/^["'«»""]|["'«»""]$/g, '') // Убираем кавычки в начале и конце
    .trim()
    .replace(/\s+/g, ' ') // Заменяем множественные пробелы на один
    .replace(/;/g, '') // Убираем точки с запятой
    .trim();
}

async function importContractors() {
  try {
    console.log('=== Начало импорта контрагентов ===\n');

    // Читаем CSV файл
    const csvPath = path.join(__dirname, '..', 'data1.csv');
    let csvContent = fs.readFileSync(csvPath, 'utf-8');

    // Убираем BOM из начала файла
    csvContent = csvContent.replace(/^\uFEFF/, '');

    // Разбираем CSV (разделитель - точка с запятой)
    const lines = csvContent.split('\n');
    const headers = lines[0].split(';').map(h => h.trim());

    console.log('Заголовки CSV:', headers);
    console.log(`Всего строк в файле: ${lines.length - 1}\n`);

    const contractors = [];
    const errors = [];

    // Обрабатываем каждую строку (пропускаем заголовок)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Пропускаем пустые строки

      const values = line.split(';');
      if (values.length < 2) {
        console.warn(`Строка ${i + 1}: Недостаточно данных, пропускаем`);
        continue;
      }

      const name = cleanCompanyName(values[0]);
      const inn = processINN(values[1]);

      // Валидация ИНН (должен быть 10 или 12 цифр)
      if (!inn || (inn.length !== 10 && inn.length !== 12)) {
        errors.push({
          line: i + 1,
          name: name,
          inn: values[1],
          processedInn: inn,
          error: `Некорректный ИНН (должен быть 10 или 12 цифр, получено: ${inn ? inn.length : 0})`
        });
        continue;
      }

      contractors.push({
        name: name,
        inn: inn,
        original_line: i + 1
      });
    }

    console.log(`Подготовлено к импорту: ${contractors.length} контрагентов`);
    if (errors.length > 0) {
      console.log(`\nОшибки при обработке (${errors.length} записей):`);
      errors.forEach(err => {
        console.log(`  Строка ${err.line}: ${err.name}`);
        console.log(`    Исходный ИНН: ${err.inn}`);
        console.log(`    Обработанный ИНН: ${err.processedInn}`);
        console.log(`    Ошибка: ${err.error}`);
      });
    }

    if (contractors.length === 0) {
      console.log('\nНет данных для импорта');
      return;
    }

    // Спрашиваем подтверждение
    console.log('\n=== Готов к импорту в базу данных ===');
    console.log('Нажмите Enter для продолжения или Ctrl+C для отмены...');

    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });

    console.log('\nНачинаем импорт в базу данных...\n');

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Импортируем по одному, чтобы обработать дубликаты
    for (const contractor of contractors) {
      try {
        // Сначала проверяем, существует ли уже такой ИНН
        const { data: existing, error: checkError } = await supabase
          .from('contractors')
          .select('id, name, inn')
          .eq('inn', contractor.inn)
          .single();

        if (existing) {
          console.log(`✓ Пропущен (уже существует): ${contractor.name} (ИНН: ${contractor.inn})`);
          skipCount++;
          continue;
        }

        // Если не существует, создаем нового контрагента
        const { data, error } = await supabase
          .from('contractors')
          .insert({
            name: contractor.name,
            inn: contractor.inn
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        console.log(`✓ Импортирован: ${contractor.name} (ИНН: ${contractor.inn})`);
        successCount++;

      } catch (error) {
        console.error(`✗ Ошибка для ${contractor.name}: ${error.message}`);
        errorCount++;
      }
    }

    // Итоговая статистика
    console.log('\n=== Импорт завершен ===');
    console.log(`Успешно импортировано: ${successCount}`);
    console.log(`Пропущено (уже существуют): ${skipCount}`);
    console.log(`Ошибок: ${errorCount}`);
    console.log(`Всего обработано: ${successCount + skipCount + errorCount}`);

  } catch (error) {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  }
}

// Запускаем импорт
console.log('CSV Импортер контрагентов для PayHub');
console.log('=====================================\n');

// Настраиваем ввод для подтверждения
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

importContractors()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Ошибка импорта:', error);
    process.exit(1);
  });