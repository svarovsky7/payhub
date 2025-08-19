import React from 'react';
import { Space, Button, Popconfirm, Tooltip } from 'antd';
import {
  CheckOutlined,
  EditOutlined,
  DeleteOutlined,
  StopOutlined,
  FileTextOutlined,
  SendOutlined,
} from '@ant-design/icons';
import type { Invoice } from '@/shared/types';

interface InvoiceActionsProps {
  invoice: Invoice;
  onApprove?: (invoice: Invoice) => void;
  onEdit?: (invoice: Invoice) => void;
  onDelete?: (invoice: Invoice) => void;
  onReject?: (invoice: Invoice) => void;
  onView?: (invoice: Invoice) => void;
  onSubmitForApproval?: (invoice: Invoice) => void;
  size?: 'small' | 'middle' | 'large';
  isMobile?: boolean;
  showApprove?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  showReject?: boolean;
  showView?: boolean;
  showSubmit?: boolean;
}

export function InvoiceActions({
  invoice,
  onApprove,
  onEdit,
  onDelete,
  onReject,
  onView,
  onSubmitForApproval,
  size = 'small',
  isMobile = false,
  showApprove = true,
  showEdit = true,
  showDelete = true,
  showReject = true,
  showView = true,
  showSubmit = true,
}: InvoiceActionsProps) {
  const buttonSize = isMobile ? 'middle' : size;
  const minHeight = isMobile ? 40 : 'auto';

  const handleClick = (e: React.MouseEvent, handler?: (invoice: Invoice) => void) => {
    e.stopPropagation();
    if (handler) {
      handler(invoice);
    }
  };

  const isDraft = invoice.status === 'draft';
  const isPaid = invoice.status === 'paid';
  const isRejected = invoice.status === 'rejected';

  return (
    <Space size="small" style={{ display: 'flex', flexWrap: 'nowrap' }}>
      {showApprove && !isDraft && !isPaid && !isRejected && onApprove && (
        <Tooltip title="Согласовать">
          <Button
            type="text"
            size={buttonSize}
            icon={<CheckOutlined />}
            onClick={(e) => handleClick(e, onApprove)}
            className="touch-target"
            style={{ 
              color: '#52c41a',
              minHeight 
            }}
          />
        </Tooltip>
      )}

      {showEdit && onEdit && (
        <Tooltip title="Редактировать">
          <Button
            type="text"
            size={buttonSize}
            icon={<EditOutlined />}
            onClick={(e) => handleClick(e, onEdit)}
            className="touch-target"
            style={{ minHeight }}
          />
        </Tooltip>
      )}

      {showDelete && (isDraft || isRejected) && onDelete && (
        <Popconfirm
          title="Удалить счет?"
          description="Это действие нельзя отменить"
          onConfirm={(e) => {
            if (e) e.stopPropagation();
            onDelete(invoice);
          }}
          onCancel={(e) => {
            if (e) e.stopPropagation();
          }}
          okText="Да"
          cancelText="Нет"
        >
          <Tooltip title="Удалить">
            <Button
              type="text"
              size={buttonSize}
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
              className="touch-target"
              style={{ minHeight }}
            />
          </Tooltip>
        </Popconfirm>
      )}

      {showReject && !isPaid && !isRejected && onReject && (
        <Popconfirm
          title="Отклонить счет?"
          description="Счет будет перемещен в статус 'Отказано'"
          onConfirm={(e) => {
            if (e) e.stopPropagation();
            onReject(invoice);
          }}
          onCancel={(e) => {
            if (e) e.stopPropagation();
          }}
          okText="Да"
          cancelText="Нет"
        >
          <Tooltip title="Отклонить">
            <Button
              type="text"
              size={buttonSize}
              icon={<StopOutlined />}
              onClick={(e) => e.stopPropagation()}
              className="touch-target"
              style={{ 
                color: '#ff4d4f',
                minHeight 
              }}
            />
          </Tooltip>
        </Popconfirm>
      )}

      {showView && onView && (
        <Tooltip title="Просмотр">
          <Button
            type="text"
            size={buttonSize}
            icon={<FileTextOutlined />}
            onClick={(e) => handleClick(e, onView)}
            className="touch-target"
            style={{ minHeight }}
          />
        </Tooltip>
      )}

      {showSubmit && isDraft && onSubmitForApproval && (
        <Tooltip title="Отправить на согласование">
          <Button
            type="text"
            size={buttonSize}
            icon={<SendOutlined />}
            onClick={(e) => handleClick(e, onSubmitForApproval)}
            style={{ 
              color: '#52c41a',
              minHeight
            }}
            className="touch-target"
          />
        </Tooltip>
      )}
    </Space>
  );
}