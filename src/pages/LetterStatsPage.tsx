import { Card, Row, Col, Spin, Statistic, Table, Select, DatePicker, Input, Space, Button, Tag, Checkbox } from 'antd'
import { MailOutlined, TeamOutlined, FolderOutlined, ClearOutlined, SearchOutlined } from '@ant-design/icons'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useLetterStatistics } from '../hooks/useLetterStatistics'
import { useState, useMemo, useCallback } from 'react'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#eb2f96', '#13c2c2', '#52c41a', '#1890ff', '#faad14']

export const LetterStatsPage = () => {
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [directionFilter, setDirectionFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [excludeOU_SU10, setExcludeOU_SU10] = useState(false)
  
  // Состояние пагинации для таблиц
  const [projectsPagination, setProjectsPagination] = useState({ current: 1, pageSize: 10 })
  const [creatorsPagination, setCreatorsPagination] = useState({ current: 1, pageSize: 10 })
  
  // Мемоизируем фильтры для предотвращения лишних запросов
  const filters = useMemo(() => ({
    selectedProjectName: selectedProject || undefined,
    directionFilter,
    searchQuery,
    excludeOU_SU10
  }), [selectedProject, directionFilter, searchQuery, excludeOU_SU10])
  
  const { stats, loading } = useLetterStatistics(filters)

  // Загружаем полные данные без фильтров для статичных блоков
  const { stats: fullStats, loading: fullLoading } = useLetterStatistics()

  // Мемоизируем данные таблиц для стабильной пагинации
  const projectsData = useMemo(() => {
    console.log('[LetterStatsPage] Projects data updated:', {
      length: fullStats.lettersByProject.length,
      data: fullStats.lettersByProject.slice(0, 3)
    })
    // Сбрасываем пагинацию при изменении данных
    setProjectsPagination(prev => ({ ...prev, current: 1 }))
    return [...fullStats.lettersByProject]
  }, [fullStats.lettersByProject])
  
  const creatorsData = useMemo(() => {
    console.log('[LetterStatsPage] Creators data updated:', {
      length: fullStats.lettersByCreator.length,
      data: fullStats.lettersByCreator.slice(0, 3)
    })
    // Сбрасываем пагинацию при изменении данных
    setCreatorsPagination(prev => ({ ...prev, current: 1 }))
    return [...fullStats.lettersByCreator]
  }, [fullStats.lettersByCreator])

  // Мемоизируем колонки для стабильности
  const projectsColumns = useMemo(() => [
    {
      title: 'Проект',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
    },
    {
      title: 'Писем',
      dataIndex: 'count',
      key: 'count',
      align: 'center' as const,
      width: 120,
      sorter: (a: any, b: any) => b.count - a.count,
      defaultSortOrder: 'descend' as const,
      render: (count: number) => <strong>{count}</strong>,
    },
  ], [])

  const creatorsColumns = useMemo(() => [
    {
      title: 'Пользователь',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
    },
    {
      title: 'Входящих',
      dataIndex: 'incoming',
      key: 'incoming',
      align: 'center' as const,
      width: 120,
      sorter: (a: any, b: any) => b.incoming - a.incoming,
      render: (count: number) => count > 0 ? <Tag color="blue">{count}</Tag> : count,
    },
    {
      title: 'Исходящих',
      dataIndex: 'outgoing',
      key: 'outgoing',
      align: 'center' as const,
      width: 120,
      sorter: (a: any, b: any) => b.outgoing - a.outgoing,
      render: (count: number) => count > 0 ? <Tag color="green">{count}</Tag> : count,
    },
    {
      title: 'Всего',
      dataIndex: 'total',
      key: 'total',
      align: 'center' as const,
      width: 100,
      sorter: (a: any, b: any) => b.total - a.total,
      defaultSortOrder: 'descend' as const,
      render: (count: number) => <strong>{count}</strong>,
    },
  ], [])

  const handleProjectsTableChange = useCallback((pagination: any, filters: any, sorter: any) => {
    console.log('[LetterStatsPage] Projects table onChange:', {
      pagination,
      filters,
      sorter,
      dataSourceLength: projectsData.length
    })
    setProjectsPagination({
      current: pagination.current,
      pageSize: pagination.pageSize
    })
  }, [projectsData.length])

  const handleCreatorsTableChange = useCallback((pagination: any, filters: any, sorter: any) => {
    console.log('[LetterStatsPage] Creators table onChange:', {
      pagination,
      filters,
      sorter,
      dataSourceLength: creatorsData.length
    })
    setCreatorsPagination({
      current: pagination.current,
      pageSize: pagination.pageSize
    })
  }, [creatorsData.length])

  const clearFilters = () => {
    setSelectedProject(null)
    setDateRange(null)
    setDirectionFilter(null)
    setSearchQuery('')
    setExcludeOU_SU10(false)
  }

  const hasActiveFilters = selectedProject || dateRange || directionFilter || searchQuery || excludeOU_SU10

  console.log('[LetterStatsPage] Render:', {
    loading,
    fullLoading,
    hasActiveFilters,
    projectsDataLength: projectsData.length,
    creatorsDataLength: creatorsData.length,
    selectedProject,
    directionFilter,
    searchQuery,
    excludeOU_SU10
  })

  if (loading || fullLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ width: '100%', maxWidth: 1600, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Статистика по письмам</h1>
        {hasActiveFilters && (
          <Button icon={<ClearOutlined />} onClick={clearFilters}>
            Сбросить фильтры
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Space wrap size="middle" style={{ width: '100%' }}>
          <Input
            placeholder="Поиск..."
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />
          <Select
            placeholder="Проект"
            style={{ width: 200 }}
            value={selectedProject}
            onChange={setSelectedProject}
            allowClear
          >
            {stats.lettersByProject.map((p) => (
              <Select.Option key={p.name} value={p.name}>
                {p.name} ({p.count})
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="Направление"
            style={{ width: 150 }}
            value={directionFilter}
            onChange={setDirectionFilter}
            allowClear
          >
            <Select.Option value="Входящие">Входящие</Select.Option>
            <Select.Option value="Исходящие">Исходящие</Select.Option>
          </Select>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            style={{ width: 300 }}
            placeholder={['Дата от', 'Дата до']}
          />
          <Checkbox checked={excludeOU_SU10} onChange={(e) => setExcludeOU_SU10(e.target.checked)}>
            Исключить ООО СУ-10
          </Checkbox>
        </Space>
        {hasActiveFilters && (
          <div style={{ marginTop: 12 }}>
            {selectedProject && <Tag closable onClose={() => setSelectedProject(null)}>Проект: {selectedProject}</Tag>}
            {directionFilter && <Tag closable onClose={() => setDirectionFilter(null)}>{directionFilter}</Tag>}
            {dateRange && <Tag closable onClose={() => setDateRange(null)}>Период: {dateRange[0].format('DD.MM.YY')} - {dateRange[1].format('DD.MM.YY')}</Tag>}
            {searchQuery && <Tag closable onClose={() => setSearchQuery('')}>Поиск: {searchQuery}</Tag>}
            {excludeOU_SU10 && <Tag closable onClose={() => setExcludeOU_SU10(false)}>Без ООО СУ-10</Tag>}
          </div>
        )}
      </Card>

      {/* Main Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Всего писем"
              value={stats.totalLetters}
              prefix={<MailOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Ответственные лица"
              value={stats.lettersByResponsible.length}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Проектов"
              value={stats.lettersByProject.length}
              prefix={<FolderOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Статусов"
              value={stats.lettersByStatus.length}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Direction and Status Charts */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card 
            title="Распределение по направлениям" 
            style={{ height: '100%' }} 
            variant="borderless"
            extra={hasActiveFilters && <Tag color="blue">Фильтруется</Tag>}
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.lettersByDirection}
                  dataKey="count"
                  nameKey="direction"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {stats.lettersByDirection.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title="Распределение по статусам" 
            style={{ height: '100%' }} 
            variant="borderless"
            extra={hasActiveFilters && <Tag color="blue">Фильтруется</Tag>}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.lettersByStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#1890ff" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Responsible Persons */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card 
            title="Письма по ответственным лицам (топ 10)" 
            variant="borderless"
            extra={hasActiveFilters && <Tag color="blue">Фильтруется</Tag>}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={stats.lettersByResponsible.slice(0, 10)}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={190} />
                <Tooltip />
                <Bar dataKey="count" fill="#52c41a" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Top Senders and Recipients */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card 
            title="Самые частые отправители (топ 10)" 
            variant="borderless"
            extra={hasActiveFilters && <Tag color="blue">Фильтруется</Tag>}
          >
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={stats.topSenders}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={190} interval={0} />
                <Tooltip />
                <Bar dataKey="count" fill="#f5222d" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title="Самые частые получатели (топ 10)" 
            variant="borderless"
            extra={hasActiveFilters && <Tag color="blue">Фильтруется</Tag>}
          >
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={stats.topRecipients}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={190} interval={0} />
                <Tooltip />
                <Bar dataKey="count" fill="#722ed1" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Projects */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card 
            title="Письма по проектам" 
            variant="borderless"
            extra={<Tag color="default">Все данные</Tag>}
          >
            {projectsData.length === 0 ? (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                Нет данных по проектам
              </div>
            ) : (
              <Table
                key={`projects-${projectsData.length}`}
                dataSource={projectsData}
                rowKey="name"
                onChange={handleProjectsTableChange}
                columns={projectsColumns}
                pagination={{ 
                  current: projectsPagination.current,
                  pageSize: projectsPagination.pageSize,
                  showSizeChanger: true, 
                  pageSizeOptions: ['10', '20', '50', '100'],
                  showTotal: (total, range) => {
                    console.log('[LetterStatsPage] Projects table pagination:', { 
                      total, 
                      range,
                      current: projectsPagination.current,
                      pageSize: projectsPagination.pageSize
                    })
                    return `${range[0]}-${range[1]} из ${total}`
                  }
                }}
                size="middle"
                scroll={{ x: 600 }}
                onRow={(record) => ({
                  onClick: () => {
                    const newProject = selectedProject === record.name ? null : record.name
                    console.log('[LetterStatsPage] Project row clicked:', {
                      record,
                      currentSelected: selectedProject,
                      newSelected: newProject
                    })
                    setSelectedProject(newProject)
                  },
                  style: {
                    cursor: 'pointer',
                    backgroundColor: selectedProject === record.name ? '#e6f7ff' : undefined,
                  },
                })}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Letters by Creator */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card 
            title="Статистика по создателям писем" 
            variant="borderless"
            extra={<Tag color="default">Все данные</Tag>}
          >
            <Table
              key={`creators-${creatorsData.length}`}
              dataSource={creatorsData}
              rowKey="name"
              onChange={handleCreatorsTableChange}
              columns={creatorsColumns}
              pagination={{ 
                current: creatorsPagination.current,
                pageSize: creatorsPagination.pageSize,
                showSizeChanger: true, 
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total, range) => {
                  console.log('[LetterStatsPage] Creators table pagination:', { 
                    total, 
                    range,
                    current: creatorsPagination.current,
                    pageSize: creatorsPagination.pageSize
                  })
                  return `${range[0]}-${range[1]} из ${total}`
                }
              }}
              size="middle"
              scroll={{ x: 600 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
