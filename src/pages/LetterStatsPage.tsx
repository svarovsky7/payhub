import { Card, Row, Col, Spin, Statistic, Table, Checkbox } from 'antd'
import { MailOutlined, TeamOutlined, FolderOutlined } from '@ant-design/icons'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useLetterStatistics } from '../hooks/useLetterStatistics'
import { useState } from 'react'

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#eb2f96', '#13c2c2', '#52c41a', '#1890ff', '#faad14']

export const LetterStatsPage = () => {
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [excludeOU_SU10, setExcludeOU_SU10] = useState(false)
  const { stats, loading } = useLetterStatistics(selectedProject || undefined)

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ width: '100%' }}>
      <h1 style={{ marginBottom: 24 }}>Статистика по письмам</h1>

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
          <Card title="Распределение по направлениям" style={{ height: '100%' }}>
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
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Распределение по статусам" style={{ height: '100%' }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.lettersByStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1890ff" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Responsible Persons */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card title="Письма по ответственным лицам (топ 10)">
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
                <Bar dataKey="count" fill="#52c41a" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Projects */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card title="Письма по проектам">
            {stats.lettersByProject.length === 0 ? (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                Нет данных по проектам
              </div>
            ) : (
              <Table
                dataSource={stats.lettersByProject}
                columns={[
                  {
                    title: 'Проект',
                    dataIndex: 'name',
                    key: 'name',
                    ellipsis: true,
                  },
                  {
                    title: 'Писем',
                    dataIndex: 'count',
                    key: 'count',
                    align: 'center' as const,
                    width: 100,
                    sorter: (a, b) => b.count - a.count,
                  },
                ]}
                pagination={false}
                size="small"
                scroll={{ x: 600 }}
                onRow={(record) => ({
                  onClick: () => setSelectedProject(selectedProject === record.name ? null : record.name),
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

      {/* Top Senders and Recipients */}
      <Row gutter={[16, 16]}>
        {selectedProject && (
          <Col xs={24}>
            <div style={{ marginBottom: 16, padding: '8px 12px', background: '#e6f7ff', borderRadius: 4, border: '1px solid #91d5ff' }}>
              <strong>Фильтр по проекту:</strong> {selectedProject}
              <span style={{ marginLeft: 12, cursor: 'pointer', color: '#1890ff', textDecoration: 'underline' }} onClick={() => setSelectedProject(null)}>
                Очистить
              </span>
            </div>
          </Col>
        )}
        <Col xs={24}>
          <Checkbox checked={excludeOU_SU10} onChange={(e) => setExcludeOU_SU10(e.target.checked)}>
            Исключить ООО СУ-10 из статистики
          </Checkbox>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Самые частые отправители (топ 10)">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={excludeOU_SU10 ? stats.topSenders.filter(item => item.name !== 'ООО СУ-10') : stats.topSenders}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={190} interval={0} />
                <Tooltip />
                <Bar dataKey="count" fill="#f5222d" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Самые частые получатели (топ 10)">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={excludeOU_SU10 ? stats.topRecipients.filter(item => item.name !== 'ООО СУ-10') : stats.topRecipients}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={190} interval={0} />
                <Tooltip />
                <Bar dataKey="count" fill="#722ed1" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Letters by Creator */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card title="Статистика по создателям писем">
            <Table
              dataSource={stats.lettersByCreator}
              columns={[
                {
                  title: 'Пользователь',
                  dataIndex: 'name',
                  key: 'name',
                  ellipsis: true,
                },
                {
                  title: 'Входящих',
                  dataIndex: 'incoming',
                  key: 'incoming',
                  align: 'center' as const,
                  width: 120,
                },
                {
                  title: 'Исходящих',
                  dataIndex: 'outgoing',
                  key: 'outgoing',
                  align: 'center' as const,
                  width: 120,
                },
                {
                  title: 'Всего',
                  dataIndex: 'total',
                  key: 'total',
                  align: 'center' as const,
                  width: 100,
                  sorter: (a, b) => b.total - a.total,
                },
              ]}
              pagination={false}
              size="small"
              scroll={{ x: 600 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
