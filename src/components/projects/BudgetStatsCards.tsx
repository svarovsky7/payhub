import React from 'react';
import { Card, Statistic, Row, Col } from 'antd';
import { DollarOutlined, FileTextOutlined } from '@ant-design/icons';
import type { ProjectBudgetStats } from '../../types/budget';

interface BudgetStatsCardsProps {
  stats: ProjectBudgetStats[];
}

export const BudgetStatsCards: React.FC<BudgetStatsCardsProps> = ({ stats }) => {
  const totalAllocated = stats.reduce((sum, b) => sum + b.allocated_amount, 0);
  const totalInvoices = stats.reduce((sum, b) => sum + b.invoice_amount, 0);
  const totalPayments = stats.reduce((sum, b) => sum + b.payment_amount, 0);
  const totalRemaining = stats.reduce((sum, b) => sum + b.remaining_amount, 0);

  return (
    <Row gutter={16}>
      <Col span={6}>
        <Card>
          <Statistic title="Всего выделено" value={totalAllocated} precision={2} prefix={<DollarOutlined />} suffix="₽" />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="Счета" value={totalInvoices} precision={2} prefix={<FileTextOutlined />} suffix="₽" />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="Платежи" value={totalPayments} precision={2} suffix="₽" valueStyle={{ color: '#3f8600' }} />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="Остаток"
            value={totalRemaining}
            precision={2}
            suffix="₽"
            valueStyle={{ color: totalRemaining >= 0 ? '#3f8600' : '#cf1322' }}
          />
        </Card>
      </Col>
    </Row>
  );
};
