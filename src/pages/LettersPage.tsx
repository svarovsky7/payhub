import { Table, Button, Space } from 'antd'
import { PlusOutlined, FilterOutlined, DownloadOutlined } from '@ant-design/icons'
import { useMemo, useState, useEffect } from 'react'
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import { useLetterManagement } from '../hooks/useLetterManagement'
import { useColumnSettings } from '../hooks/useColumnSettings'
import { getLetterTableColumns } from '../components/letters/LetterTableColumns'
import { LetterFormModal } from '../components/letters/LetterFormModal'
import { LetterViewModal } from '../components/letters/LetterViewModal'
import { LinkLetterModal } from '../components/letters/LinkLetterModal'
import { AttachmentRecognitionModal } from '../components/letters/AttachmentRecognitionModal'
import { LetterFilters, type LetterFilterValues } from '../components/letters/LetterFilters'
import { ColumnSettings } from '../components/common/ColumnSettings'
import type { Letter } from '../lib/supabase'
import { exportLettersToExcel } from '../utils/letterExcelExport'
import { downloadAllLetterMarkdowns } from '../utils/letterMarkdownExport'
import { addYamlToLetterMarkdowns } from '../utils/addYamlToLetterMarkdowns'
import { useAuth } from '../contexts/AuthContext'
import { getTasks, subscribeToTasks, type RecognitionTask } from '../services/recognitionTaskService'

dayjs.extend(isBetween)

export const LettersPage = () => {
  console.log('[LettersPage] Rendering')
  
  const { user } = useAuth()
  const [recognitionTasks, setRecognitionTasks] = useState<RecognitionTask[]>([])

  // Подписка на обновления задач распознавания
  useEffect(() => {
    const tasks = getTasks()
    console.log('[LettersPage] Initial recognition tasks:', tasks)
    setRecognitionTasks(tasks)
    
    const unsubscribe = subscribeToTasks(() => {
      const updatedTasks = getTasks()
      console.log('[LettersPage] Recognition tasks updated:', updatedTasks)
      setRecognitionTasks(updatedTasks)
    })
    return unsubscribe
  }, [])
  
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
    loadData,
    handleOpenCreateModal,
    handleViewLetter,
    handleCreateLetter,
    handleUpdateLetter,
    handleDeleteLetter,
    handleOpenLinkModal,
    handleLinkLetters,
    handleUnlinkLetters
  } = useLetterManagement()

  console.log('[LettersPage] Hook data', { 
    lettersCount: letters.length, 
    loading,
    hasStatuses: letterStatuses.length > 0,
    hasProjects: projects.length > 0
  })

  const [filterValues, setFilterValues] = useState<LetterFilterValues>({})
  const [filtersVisible, setFiltersVisible] = useState(false)
  const [recognitionModalVisible, setRecognitionModalVisible] = useState(false)
  const [recognizingLetter, setRecognizingLetter] = useState<Letter | null>(null)

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

  // Get unique creators
  const creators = useMemo(() => {
    const creatorSet = new Set<string>()
    const collectCreators = (lettersList: Letter[]) => {
      lettersList.forEach(letter => {
        if (letter.creator?.full_name) {
          creatorSet.add(letter.creator.full_name)
        }
        if (letter.children) {
          collectCreators(letter.children)
        }
      })
    }
    collectCreators(letters)
    return Array.from(creatorSet).sort()
  }, [letters])

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

      // Filter by creator
      if (filterValues.creator) {
        const letterCreator = letter.creator?.full_name
        if (letterCreator !== filterValues.creator) {
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
      if (filterValues.number && !letter.number?.toLowerCase().includes(filterValues.number.toLowerCase())) {
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
        .map(letter => {
          // Check if current letter matches
          const matchesSelf = filterLetter(letter)
          
          // If matches self, return it with all children (showing full chain context)
          if (matchesSelf) {
            return letter
          }

          // If doesn't match self, check children recursively
          if (letter.children && letter.children.length > 0) {
             const filteredChildren = filterLettersRecursive(letter.children)
             if (filteredChildren.length > 0) {
               return {
                 ...letter,
                 children: filteredChildren
               }
             }
          }
          
          return null
        })
        .filter((item): item is Letter => item !== null)
    }

    return filterLettersRecursive(letters)
  }, [letters, filterValues])

  const handleFilter = (values: LetterFilterValues) => {
    setFilterValues(values)
  }

  const handleResetFilters = () => {
    setFilterValues({})
  }

  const handleStatusChange = async (letterId: string, newStatusId: number) => {
    try {
      await handleUpdateLetter(letterId, { status_id: newStatusId })
    } catch (error) {
      console.error('[LettersPage.handleStatusChange] Error:', error)
    }
  }

  const handleEditLetter = (letter: Letter) => {
    setEditingLetter(letter)
    setLetterModalVisible(true)
  }

  const handleRecognizeAttachments = (letter: Letter) => {
    setRecognizingLetter(letter)
    setRecognitionModalVisible(true)
  }

  const handleAddYamlToMarkdowns = async () => {
    try {
      await addYamlToLetterMarkdowns(letters)
    } catch (error) {
      console.error('[LettersPage.handleAddYamlToMarkdowns] Error:', error)
    }
  }

  // Table columns
  const allColumns = getLetterTableColumns({
    letterStatuses,
    projects,
    users,
    handleViewLetter,
    handleEditLetter,
    handleDeleteLetter,
    handleLinkLetter: handleOpenLinkModal,
    handleUnlinkLetter: handleUnlinkLetters,
    handleStatusChange,
    handleRecognizeAttachments,
    currentUserId: user?.id || null,
    recognitionTasks
  })

  // Column settings
  const { columnConfig, setColumnConfig, visibleColumns, defaultConfig } = useColumnSettings(
    allColumns,
    'letters_column_settings_v3'
  )

  // Handle form submit
  const handleFormSubmit = async (values: any, files: File[], originalFiles: string[], fileDescriptions: Record<string, string>, existingFileDescriptions: Record<string, string>) => {
    if (editingLetter) {
      const { formData } = values
      await handleUpdateLetter(editingLetter.id, formData, files, originalFiles, fileDescriptions, existingFileDescriptions)
    } else {
      const { formData, publicShareToken } = values
      await handleCreateLetter(formData, files, fileDescriptions, publicShareToken)
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
          <Button
            icon={<DownloadOutlined />}
            onClick={() => exportLettersToExcel(filteredLetters)}
          >
            Скачать в Excel
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={downloadAllLetterMarkdowns}
          >
            Скачать Markdown
          </Button>
          <Button
            onClick={handleAddYamlToMarkdowns}
          >
            Добавить YAML
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
          creators={creators}
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
          defaultPageSize: 100,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} из ${total}`,
          pageSizeOptions: ['50', '100', '200']
        }}
        scroll={{ x: 1870, y: 'calc(100vh - 280px)' }}
        sticky
        className="compact-table"
        childrenColumnName="children"
        indentSize={12}
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
        letters={letters}
      />

      {/* Letter View Modal */}
      <LetterViewModal
        visible={viewModalVisible}
        onClose={() => {
          setViewModalVisible(false)
          setViewingLetter(null)
        }}
        letter={viewingLetter}
        onFileDeleted={loadData}
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

      {/* Attachment Recognition Modal */}
      <AttachmentRecognitionModal
        visible={recognitionModalVisible}
        letter={recognizingLetter}
        onCancel={() => {
          setRecognitionModalVisible(false)
          setRecognizingLetter(null)
        }}
        onSuccess={() => {
          console.log('[LettersPage] 📢 Recognition completed! Calling loadData(true)...')
          loadData(true)
        }}
      />
    </div>
  )
}
