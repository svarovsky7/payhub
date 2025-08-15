import { useState } from 'react';
import { 
  Input, 
  Select, 
  DatePicker, 
  Button, 
  Space, 
  Card, 
  Statistic, 
  Row, 
  Col,
  Tooltip,
  Divider,
} from 'antd';
import { 
  SearchOutlined, 
  ReloadOutlined, 
  DownloadOutlined, 
  ClearOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { contractorApi } from '@/entities/contractor';
import { projectApi } from '@/entities/project';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface KanbanFiltersProps {
  filters: {
    search: string;
    contractorId: number | null;
    projectId: number | null;
    dateRange: [string, string] | null;
  };
  onFiltersChange: (filters: {
    search: string;
    contractorId: number | null;
    projectId: number | null;
    dateRange: [string, string] | null;
  }) => void;
  onRefresh: () => void;
  totalInvoices: number;
  totalAmount: number;
}

export function KanbanFilters({
  filters,
  onFiltersChange,
  onRefresh,
  totalInvoices,
  totalAmount,
}: KanbanFiltersProps) {
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const { data: contractors = [] } = useQuery({
    queryKey: ['contractors'],
    queryFn: contractorApi.getAll,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectApi.getAll,
  });

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleContractorChange = (value: number | null) => {
    onFiltersChange({ ...filters, contractorId: value });
  };

  const handleProjectChange = (value: number | null) => {
    onFiltersChange({ ...filters, projectId: value });
  };

  const handleDateRangeChange = (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    const dateRange = dates && dates[0] && dates[1]
      ? [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')] as [string, string]
      : null;
    onFiltersChange({ ...filters, dateRange });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      contractorId: null,
      projectId: null,
      dateRange: null,
    });
  };

  const handleExportToExcel = () => {
    // This would need access to the filtered invoices data
    // For now, just show a placeholder
    console.log('Export to Excel functionality would be implemented here');
  };

  const hasActiveFilters = filters.search || filters.contractorId || filters.projectId || filters.dateRange;

  return (
    <div className="kanban-filters">
      <Card className="filters-card">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8} lg={6}>
            <Input
              placeholder="Поиск по номеру, описанию..."
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              allowClear
            />
          </Col>
          
          <Col xs={12} sm={6} md={4} lg={3}>
            <Tooltip title="Показать дополнительные фильтры">
              <Button
                type={filtersExpanded ? 'primary' : 'default'}
                icon={<FilterOutlined />}
                onClick={() => setFiltersExpanded(!filtersExpanded)}
              >
                Фильтры
              </Button>
            </Tooltip>
          </Col>

          <Col xs={12} sm={6} md={4} lg={3}>
            <Space>
              <Tooltip title="Обновить данные">
                <Button icon={<ReloadOutlined />} onClick={onRefresh} />
              </Tooltip>
              <Tooltip title="Экспорт в Excel">
                <Button icon={<DownloadOutlined />} onClick={handleExportToExcel} />
              </Tooltip>
              {hasActiveFilters && (
                <Tooltip title="Очистить фильтры">
                  <Button icon={<ClearOutlined />} onClick={handleClearFilters} />
                </Tooltip>
              )}
            </Space>
          </Col>

          <Col xs={24} sm={24} md={8} lg={12}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Количество счетов"
                  value={totalInvoices}
                  valueStyle={{ fontSize: '18px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Общая сумма"
                  value={formatAmount(totalAmount)}
                  valueStyle={{ fontSize: '18px', color: '#1890ff' }}
                />
              </Col>
            </Row>
          </Col>
        </Row>

        {filtersExpanded && (
          <>
            <Divider style={{ margin: '16px 0' }} />
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8} lg={6}>
                <Select
                  placeholder="Выберите поставщика"
                  value={filters.contractorId}
                  onChange={handleContractorChange}
                  allowClear
                  style={{ width: '100%' }}
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    String(option?.children || '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {contractors.map((contractor) => (
                    <Option key={contractor.id} value={contractor.id}>
                      {contractor.name}
                    </Option>
                  ))}
                </Select>
              </Col>

              <Col xs={24} sm={12} md={8} lg={6}>
                <Select
                  placeholder="Выберите проект"
                  value={filters.projectId}
                  onChange={handleProjectChange}
                  allowClear
                  style={{ width: '100%' }}
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    String(option?.children || '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {projects.map((project) => (
                    <Option key={project.id} value={project.id}>
                      {project.name}
                    </Option>
                  ))}
                </Select>
              </Col>

              <Col xs={24} sm={12} md={8} lg={6}>
                <RangePicker
                  placeholder={['Дата от', 'Дата до']}
                  value={filters.dateRange ? [dayjs(filters.dateRange[0]), dayjs(filters.dateRange[1])] : null}
                  onChange={handleDateRangeChange}
                  style={{ width: '100%' }}
                  format="DD.MM.YYYY"
                />
              </Col>

              <Col xs={24} sm={12} md={8} lg={6}>
                <Space>
                  <Button onClick={handleClearFilters} disabled={!hasActiveFilters}>
                    Очистить все
                  </Button>
                </Space>
              </Col>
            </Row>
          </>
        )}
      </Card>

      <style>{`
        .kanban-filters {
          margin-bottom: 16px;
        }

        .filters-card {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .filters-card :global(.ant-card-body) {
          padding: 16px;
        }

        .filters-card :global(.ant-statistic-title) {
          font-size: 12px;
          margin-bottom: 4px;
        }

        .filters-card :global(.ant-statistic-content) {
          line-height: 1.2;
        }

        @media (max-width: 768px) {
          .filters-card :global(.ant-statistic) {
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}