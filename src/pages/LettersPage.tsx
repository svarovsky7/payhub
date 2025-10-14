import { Table, Button, Space } from 'antd'
import { PlusOutlined, FilterOutlined } from '@ant-design/icons'
import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import { useLetterManagement } from '../hooks/useLetterManagement'
import { useColumnSettings } from '../hooks/useColumnSettings'
import { getLetterTableColumns } from '../components/letters/LetterTableColumns'
import { LetterFormModal } from '../components/letters/LetterFormModal'
import { LetterViewModal } from '../components/letters/LetterViewModal'
import { LinkLetterModal } from '../components/letters/LinkLetterModal'
import { LetterFilters, type LetterFilterValues } from '../components/letters/LetterFilters'
import { ColumnSettings } from '../components/common/ColumnSettings'
import type { Letter } from '../lib/supabase'

dayjs.extend(isBetween)

export const LettersPage = () => {
  const {
    letters,
    letterStatuses,
    projects,
    users,
    loading,
    letterModalVisible,
    setLetterModalVisible,
    editingLetter,
    setEditingLetter,
    viewModalVisible,
    setViewModalVisible,
    viewingLetter,
    setViewingLetter,
    linkModalVisible,
    setLinkModalVisible,
    linkingLetter,
    setLinkingLetter,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleViewLetter,
    handleCreateLetter,
    handleUpdateLetter,
    handleDeleteLetter,
    handleOpenLinkModal,
    handleLinkLetters,
    handleUnlinkLetters
  } = useLetterManagement()

  const [filterValues, setFilterValues] = useState<LetterFilterValues>({})
  const [filtersVisible, setFiltersVisible] = useState(false)

  // Get unique senders for filter
  const senders = useMemo(() => {
    const senderSet = new Set<string>()
    const collectSenders = (lettersList: Letter[]) => {
      lettersList.forEach(letter => {
        if (letter.sender) {
          senderSet.add(letter.sender)
        }
        if (letter.children) {
          collectSenders(letter.children)
        }
      })
    }
    collectSenders(letters)
    return Array.from(senderSet).sort()
  }, [letters])

  // Get unique responsible persons (from both users and custom names)
  const responsiblePersons = useMemo(() => {
    const responsibleSet = new Set<string>()

    // Add all users
    users.forEach(user => {
      responsibleSet.add(user.full_name)
    })

    // Add custom responsible person names from letters
    const collectResponsible = (lettersList: Letter[]) => {
      lettersList.forEach(letter => {
        if (letter.responsible_person_name) {
          responsibleSet.add(letter.responsible_person_name)
        }
        if (letter.children) {
          collectResponsible(letter.children)
        }
      })
    }
    collectResponsible(letters)

    return Array.from(responsibleSet).sort()
  }, [letters, users])

  // Filter letters
  const filteredLetters = useMemo(() => {
    const filterLetter = (letter: Letter): boolean => {
      // Filter by project
      if (filterValues.project_id && letter.project_id !== filterValues.project_id) {
        return false
      }

      // Filter by reg_number
      if (filterValues.reg_number && (!letter.reg_number || !letter.reg_number.toLowerCase().includes(filterValues.reg_number.toLowerCase()))) {
        return false
      }

      // Filter by responsible (check both responsible_user full_name and responsible_person_name)
      if (filterValues.responsible) {
        const responsibleUserName = letter.responsible_user?.full_name
        const responsiblePersonName = letter.responsible_person_name
        const matchesUser = responsibleUserName === filterValues.responsible
        const matchesPerson = responsiblePersonName === filterValues.responsible
        if (!matchesUser && !matchesPerson) {
          return false
        }
      }

      // Filter by status
      if (filterValues.status_id && letter.status_id !== filterValues.status_id) {
        return false
      }

      // Filter by sender
      if (filterValues.sender && letter.sender !== filterValues.sender) {
        return false
      }

      // Filter by number
      if (filterValues.number && !letter.number.toLowerCase().includes(filterValues.number.toLowerCase())) {
        return false
      }

      // Filter by date range
      if (filterValues.dateRange && filterValues.dateRange.length === 2) {
        const letterDate = dayjs(letter.letter_date)
        const [startDate, endDate] = filterValues.dateRange
        if (!letterDate.isBetween(startDate, endDate, 'day', '[]')) {
          return false
        }
      }

      // Filter by search text (in subject and content)
      if (filterValues.searchText) {
        const searchLower = filterValues.searchText.toLowerCase()
        const subjectMatch = letter.subject?.toLowerCase().includes(searchLower)
        const contentMatch = letter.content?.toLowerCase().includes(searchLower)
        if (!subjectMatch && !contentMatch) {
          return false
        }
      }

      return true
    }

    const filterLettersRecursive = (lettersList: Letter[]): Letter[] => {
      return lettersList
        .filter(letter => {
          // Check if parent letter matches
          const parentMatches = filterLetter(letter)

          // Check if any child matches
          const childrenMatch = letter.children?.some(child => filterLetter(child))

          return parentMatches || childrenMatch
        })
        .map(letter => {
          // Filter children if they exist
          if (letter.children && letter.children.length > 0) {
            const filteredChildren = letter.children.filter(child => filterLetter(child))
            return {
              ...letter,
              children: filteredChildren.length > 0 ? filteredChildren : undefined
            }
          }
          return letter
        })
    }

    return filterLettersRecursive(letters)
  }, [letters, filterValues])

  const handleFilter = (values: LetterFilterValues) => {
    console.log('[LettersPage.handleFilter] Applying filters:', values)
    setFilterValues(values)
  }

  const handleResetFilters = () => {
    console.log('[LettersPage.handleResetFilters] Resetting filters')
    setFilterValues({})
  }

  const handleStatusChange = async (letterId: string, newStatusId: number) => {
    console.log('[LettersPage.handleStatusChange] Changing status:', { letterId, newStatusId })
    try {
      await handleUpdateLetter(letterId, { status_id: newStatusId }, [], [])
    } catch (error) {
      console.error('[LettersPage.handleStatusChange] Error:', error)
    }
  }

  // Table columns
  const allColumns = getLetterTableColumns({
    letterStatuses,
    projects,
    users,
    handleViewLetter,
    handleEditLetter: handleOpenEditModal,
    handleDeleteLetter,
    handleLinkLetter: handleOpenLinkModal,
    handleUnlinkLetter: handleUnlinkLetters,
    handleStatusChange
  })

  // Column settings
  const { columnConfig, setColumnConfig, visibleColumns, defaultConfig } = useColumnSettings(
    allColumns,
    'letters_column_settings'
  )

  // Handle form submit
  const handleFormSubmit = async (values: any, files: File[], originalFiles: string[]) => {
    if (editingLetter) {
      await handleUpdateLetter(editingLetter.id, values, files, originalFiles)
    } else {
      await handleCreateLetter(values, files)
    }
  }

  return (
    <div style={{ padding: 24, width: '100%' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Письма</h1>
        <Space>
          <Button
            icon={<FilterOutlined />}
            onClick={() => setFiltersVisible(!filtersVisible)}
          >
            Фильтры
          </Button>
          <ColumnSettings
            columns={columnConfig}
            onChange={setColumnConfig}
            defaultColumns={defaultConfig}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreateModal}
          >
            Добавить письмо
          </Button>
        </Space>
      </div>

      {filtersVisible && (
        <LetterFilters
          senders={senders}
          projects={projects}
          letterStatuses={letterStatuses}
          responsiblePersons={responsiblePersons}
          onFilter={handleFilter}
          onReset={handleResetFilters}
        />
      )}

      <Table
        columns={visibleColumns}
        dataSource={filteredLetters}
        rowKey="id"
        loading={loading}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} из ${total}`,
          pageSizeOptions: ['10', '20', '50', '100']
        }}
        scroll={{ x: 'max-content' }}
        className="compact-table"
        childrenColumnName="children"
        indentSize={24}
        defaultExpandAllRows={false}
      />

      {/* Letter Form Modal */}
      <LetterFormModal
        visible={letterModalVisible}
        onCancel={() => {
          setLetterModalVisible(false)
          setEditingLetter(null)
        }}
        onSubmit={handleFormSubmit}
        editingLetter={editingLetter}
        letterStatuses={letterStatuses}
        projects={projects}
        users={users}
      />

      {/* Letter View Modal */}
      <LetterViewModal
        visible={viewModalVisible}
        onClose={() => {
          setViewModalVisible(false)
          setViewingLetter(null)
        }}
        letter={viewingLetter}
      />

      {/* Link Letter Modal */}
      <LinkLetterModal
        visible={linkModalVisible}
        onCancel={() => {
          setLinkModalVisible(false)
          setLinkingLetter(null)
        }}
        onLink={handleLinkLetters}
        currentLetter={linkingLetter}
        availableLetters={letters}
      />
    </div>
  )
}
