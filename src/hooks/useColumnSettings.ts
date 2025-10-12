import { useState, useEffect, useMemo } from 'react'
import type { ColumnsType } from 'antd/es/table'

export interface ColumnConfig {
  key: string
  title: string
  visible: boolean
}

export const useColumnSettings = <T extends Record<string, any>>(
  allColumns: ColumnsType<T>,
  storageKey: string = 'column_settings'
) => {
  const defaultConfig: ColumnConfig[] = useMemo(
    () =>
      allColumns.map((col) => ({
        key: col.key as string,
        title: col.title as string,
        visible: true,
      })),
    [allColumns]
  )

  const loadSettings = (): ColumnConfig[] => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (!saved) return defaultConfig

      const parsed = JSON.parse(saved) as ColumnConfig[]

      // Проверяем, что все колонки из defaultConfig присутствуют
      const savedKeys = new Set(parsed.map((c) => c.key))
      const allKeys = defaultConfig.map((c) => c.key)

      // Если есть новые колонки или структура изменилась, используем дефолт
      if (allKeys.some((key) => !savedKeys.has(key))) {
        return defaultConfig
      }

      // Фильтруем только те колонки, которые есть в defaultConfig
      return parsed.filter((col) => allKeys.includes(col.key))
    } catch (error) {
      console.error('[useColumnSettings] Error loading settings:', error)
      return defaultConfig
    }
  }

  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(loadSettings)

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(columnConfig))
    } catch (error) {
      console.error('[useColumnSettings] Error saving settings:', error)
    }
  }, [columnConfig, storageKey])

  const visibleColumns = useMemo(() => {
    const configMap = new Map(columnConfig.map((c) => [c.key, c]))

    // Создаем массив колонок в порядке из columnConfig
    const orderedColumns: ColumnsType<T> = []

    for (const config of columnConfig) {
      const column = allColumns.find((col) => col.key === config.key)
      if (column && config.visible) {
        orderedColumns.push(column)
      }
    }

    // Добавляем колонки, которых нет в config (на случай если появились новые)
    for (const column of allColumns) {
      if (!configMap.has(column.key as string)) {
        orderedColumns.push(column)
      }
    }

    return orderedColumns
  }, [columnConfig, allColumns])

  return {
    columnConfig,
    setColumnConfig,
    visibleColumns,
    defaultConfig,
  }
}
