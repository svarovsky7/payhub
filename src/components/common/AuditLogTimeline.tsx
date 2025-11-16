import { useState, useEffect } from 'react';
import { Timeline, Spin, Empty, Tag, Typography, Tooltip } from 'antd';
import {
  FileAddOutlined,
  EditOutlined,
  CheckCircleOutlined,
  PlusCircleOutlined,
  DeleteOutlined,
  SwapOutlined,
  MinusCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';
import type {
  AuditLogView,
  AuditAction,
  FileAuditMetadata,
  StatusChangeMetadata,
  ApprovalActionMetadata,
} from '../../types/audit';
import { supabase } from '../../lib/supabase';

dayjs.extend(relativeTime);
dayjs.locale('ru');

const { Text, Paragraph } = Typography;

interface AuditLogTimelineProps {
  auditLog: AuditLogView[];
  loading?: boolean;
}

// Маппинг названий полей на русский
const fieldNameMap: Record<string, string> = {
  invoice_number: 'Номер счета',
  invoice_date: 'Дата счета',
  amount_with_vat: 'Сумма с НДС',
  vat_rate: 'Ставка НДС (%)',
  vat_amount: 'Сумма НДС',
  amount_without_vat: 'Сумма без НДС',
  status_id: 'Статус',
  payer_id: 'Плательщик',
  supplier_id: 'Поставщик',
  project_id: 'Проект',
  contract_id: 'Договор',
  responsible_id: 'Ответственный менеджер снабжения',
  material_request_id: 'Заявка на материалы',
  delivery_cost: 'Стоимость доставки',
  delivery_days: 'Срок поставки (дни)',
  delivery_days_type: 'Тип дней поставки',
  preliminary_delivery_date: 'Предварительная дата поставки',
  due_date: 'Срок оплаты',
  description: 'Описание',
  is_archived: 'Архивирован',
  payment_number: 'Номер платежа',
  payment_date: 'Дата платежа',
  amount: 'Сумма',
  payment_type_id: 'Тип платежа',
  allocated_amount: 'Распределенная сумма',
  // Поля письма
  number: 'Номер письма',
  reg_number: 'Регистрационный номер',
  letter_date: 'Дата письма',
  reg_date: 'Дата регистрации',
  response_deadline: 'Регламентный срок ответа',
  subject: 'Тема',
  content: 'Содержание',
  sender: 'Отправитель',
  recipient: 'Получатель',
  direction: 'Направление',
  delivery_method: 'Способ доставки/отправки',
  responsible_user_id: 'Ответственный пользователь',
  responsible_person_name: 'Ответственный',
  sender_type: 'Тип отправителя',
  sender_contractor_id: 'Контрагент-отправитель',
  recipient_type: 'Тип получателя',
  recipient_contractor_id: 'Контрагент-получатель',
};

// Маппинг действий на русский и цвета
const actionConfig: Record<
  AuditAction,
  { label: string; color: string; icon: React.ReactNode }
> = {
  create: {
    label: 'Создание',
    color: 'success',
    icon: <PlusCircleOutlined />,
  },
  update: {
    label: 'Изменение',
    color: 'processing',
    icon: <EditOutlined />,
  },
  delete: {
    label: 'Удаление',
    color: 'error',
    icon: <DeleteOutlined />,
  },
  file_add: {
    label: 'Добавление файла',
    color: 'cyan',
    icon: <FileAddOutlined />,
  },
  file_delete: {
    label: 'Удаление файла',
    color: 'orange',
    icon: <MinusCircleOutlined />,
  },
  status_change: {
    label: 'Изменение статуса',
    color: 'purple',
    icon: <SwapOutlined />,
  },
  approval_action: {
    label: 'Действие согласования',
    color: 'blue',
    icon: <CheckCircleOutlined />,
  },
  view: {
    label: 'Просмотр',
    color: 'default',
    icon: <EyeOutlined />,
  },
};

// Поля, содержащие денежные суммы
const MONEY_FIELDS = [
  'amount_with_vat',
  'vat_amount',
  'amount_without_vat',
  'amount',
  'allocated_amount',
  'delivery_cost',
];

function formatFieldValue(
  value: string | undefined,
  fieldName?: string
): string {
  if (!value) return '—';

  // Форматирование ставки НДС
  if (fieldName === 'vat_rate') {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      return `${numValue}%`;
    }
  }

  // Форматирование типа дней поставки
  if (fieldName === 'delivery_days_type') {
    return value === 'working' ? 'Рабочие дни' : 'Календарные дни';
  }

  // Форматирование направления письма
  if (fieldName === 'direction') {
    return value === 'incoming' ? 'Входящее' : value === 'outgoing' ? 'Исходящее' : value;
  }

  // Форматирование типа отправителя/получателя
  if (fieldName === 'sender_type' || fieldName === 'recipient_type') {
    return value === 'contractor' ? 'Контрагент' : value === 'individual' ? 'Физ. лицо' : value;
  }

  // Форматирование денежных сумм
  if (fieldName && MONEY_FIELDS.includes(fieldName)) {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numValue);
    }
  }

  // Пытаемся распознать дату
  if (dayjs(value, 'YYYY-MM-DD', true).isValid()) {
    return dayjs(value).format('DD.MM.YYYY');
  }

  // Пытаемся распознать булево значение
  if (value === 'true') return 'Да';
  if (value === 'false') return 'Нет';

  return value;
}

function renderActionDetails(entry: AuditLogView, letterStatuses: Record<number, string>): React.ReactNode {
  const { action, field_name, old_value, new_value, metadata, entity_type } = entry;

  switch (action) {
    case 'create':
      if (metadata) {
        const createMeta = metadata as any;
        const parts = [];

        if (createMeta.invoice_number) {
          parts.push(`Номер: ${createMeta.invoice_number}`);
        }
        if (createMeta.payment_number !== undefined) {
          parts.push(`Номер: ${createMeta.payment_number}`);
        }
        if (createMeta.amount) {
          parts.push(`Сумма: ${new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(Number(createMeta.amount))}`);
        }

        return parts.length > 0 ? (
          <Text type="secondary" style={{ fontSize: 12 }}>{parts.join(' • ')}</Text>
        ) : null;
      }
      return null;

    case 'update':
      // Специальная обработка для status_id - показываем как смену статуса
      if (field_name === 'status_id') {
        const statusMeta = metadata as StatusChangeMetadata | undefined;
        let oldStatusName = statusMeta?.old_status_name || old_value;
        let newStatusName = statusMeta?.new_status_name || new_value;
        
        console.log('[AuditLogTimeline.renderActionDetails] Update status_id:', {
          entity_type,
          old_value,
          new_value,
          statusMeta,
          letterStatuses,
          letterStatusesKeys: Object.keys(letterStatuses)
        });
        
        // For letter statuses, try to get name from letterStatuses map
        if (entity_type === 'letter' && !statusMeta?.old_status_name) {
          const oldId = old_value ? parseInt(old_value) : null;
          const newId = new_value ? parseInt(new_value) : null;
          
          console.log('[AuditLogTimeline.renderActionDetails] Parsing letter status IDs (update):', {
            oldId,
            newId,
            oldIdInMap: oldId ? letterStatuses[oldId] : undefined,
            newIdInMap: newId ? letterStatuses[newId] : undefined
          });
          
          if (oldId && letterStatuses[oldId]) {
            oldStatusName = letterStatuses[oldId];
          }
          if (newId && letterStatuses[newId]) {
            newStatusName = letterStatuses[newId];
          }
        }
        
        console.log('[AuditLogTimeline.renderActionDetails] Final status names (update):', {
          oldStatusName,
          newStatusName
        });
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Tag color="default" style={{ margin: 0, fontSize: 11 }}>
              {oldStatusName}
            </Tag>
            <Text style={{ fontSize: 12 }}>→</Text>
            <Tag color="success" style={{ margin: 0, fontSize: 11 }}>
              {newStatusName}
            </Tag>
          </div>
        );
      }
      
      // Специальная обработка для полей с метаданными (для отображения имен вместо ID)
      const metaData = metadata as any;
      let oldDisplay = old_value;
      let newDisplay = new_value;

      // Показываем имена из метаданных для справочных полей
      if (field_name === 'payer_id' && metaData) {
        oldDisplay = metaData.old_payer_name || old_value;
        newDisplay = metaData.new_payer_name || new_value;
      } else if (field_name === 'supplier_id' && metaData) {
        oldDisplay = metaData.old_supplier_name || old_value;
        newDisplay = metaData.new_supplier_name || new_value;
      } else if (field_name === 'project_id' && metaData) {
        oldDisplay = metaData.old_project_name || old_value;
        newDisplay = metaData.new_project_name || new_value;
      } else if (field_name === 'contract_id' && metaData) {
        oldDisplay = metaData.old_contract_number || old_value;
        newDisplay = metaData.new_contract_number || new_value;
      } else if (field_name === 'responsible_id' && metaData) {
        oldDisplay = metaData.old_responsible_name || old_value;
        newDisplay = metaData.new_responsible_name || new_value;
      } else if (field_name === 'material_request_id' && metaData) {
        oldDisplay = metaData.old_request_number || old_value;
        newDisplay = metaData.new_request_number || new_value;
      } else if (field_name === 'delivery_days' && metaData) {
        // Для срока поставки показываем дни + тип
        const oldType = metaData.old_delivery_days_type === 'working' ? 'раб.' : 'кал.';
        const newType = metaData.new_delivery_days_type === 'working' ? 'раб.' : 'кал.';
        oldDisplay = old_value ? `${old_value} ${oldType} дн.` : '—';
        newDisplay = new_value ? `${new_value} ${newType} дн.` : '—';
      } else if (field_name === 'sender_contractor_id' && metaData) {
        oldDisplay = metaData.old_sender_name || old_value;
        newDisplay = metaData.new_sender_name || new_value;
      } else if (field_name === 'recipient_contractor_id' && metaData) {
        oldDisplay = metaData.old_recipient_name || old_value;
        newDisplay = metaData.new_recipient_name || new_value;
      } else {
        oldDisplay = formatFieldValue(old_value, field_name);
        newDisplay = formatFieldValue(new_value, field_name);
      }

      return (
        <div>
          <Text strong style={{ fontSize: 12 }}>{fieldNameMap[field_name || ''] || field_name}: </Text>
          <Text delete type="secondary" style={{ fontSize: 12 }}>
            {oldDisplay}
          </Text>
          <Text style={{ margin: '0 4px' }}>→</Text>
          <Text strong>{newDisplay}</Text>
        </div>
      );

    case 'status_change':
      const statusMeta = metadata as StatusChangeMetadata | undefined;
      let oldStatusName = statusMeta?.old_status_name || old_value;
      let newStatusName = statusMeta?.new_status_name || new_value;
      
      console.log('[AuditLogTimeline.renderActionDetails] Status change:', {
        entity_type,
        old_value,
        new_value,
        statusMeta,
        letterStatuses,
        letterStatusesKeys: Object.keys(letterStatuses)
      });
      
      // For letter statuses, try to get name from letterStatuses map
      if (entity_type === 'letter' && !statusMeta?.old_status_name) {
        const oldId = old_value ? parseInt(old_value) : null;
        const newId = new_value ? parseInt(new_value) : null;
        
        console.log('[AuditLogTimeline.renderActionDetails] Parsing letter status IDs:', {
          oldId,
          newId,
          oldIdInMap: oldId ? letterStatuses[oldId] : undefined,
          newIdInMap: newId ? letterStatuses[newId] : undefined
        });
        
        if (oldId && letterStatuses[oldId]) {
          oldStatusName = letterStatuses[oldId];
        }
        if (newId && letterStatuses[newId]) {
          newStatusName = letterStatuses[newId];
        }
      }
      
      console.log('[AuditLogTimeline.renderActionDetails] Final status names:', {
        oldStatusName,
        newStatusName
      });
      
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Tag color="default" style={{ margin: 0, fontSize: 11 }}>
            {oldStatusName}
          </Tag>
          <Text style={{ fontSize: 12 }}>→</Text>
          <Tag color="success" style={{ margin: 0, fontSize: 11 }}>
            {newStatusName}
          </Tag>
        </div>
      );

    case 'file_add':
      const addFileMeta = metadata as FileAuditMetadata | undefined;
      const addFileName = addFileMeta?.file_name || 'Файл';
      const addFileSize = addFileMeta?.file_size
        ? ` (${(addFileMeta.file_size / 1024).toFixed(1)} KB)`
        : '';

      return (
        <div>
          <Text strong style={{ fontSize: 12 }}>
            {addFileName}{addFileSize}
          </Text>
          {addFileMeta?.description && (
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {addFileMeta.description}
              </Text>
            </div>
          )}
        </div>
      );

    case 'file_delete':
      const delFileMeta = metadata as FileAuditMetadata | undefined;
      const delFileName = delFileMeta?.file_name || 'Файл';

      return (
        <Text type="secondary" style={{ fontSize: 12 }} delete>
          {delFileName}
        </Text>
      );

    case 'approval_action':
      const approvalMeta = metadata as ApprovalActionMetadata | undefined;
      const isApproved = approvalMeta?.approval_action === 'approved';
      const isRejected = approvalMeta?.approval_action === 'rejected';

      return (
        <div>
          <div style={{ marginBottom: approvalMeta?.comment ? 4 : 0 }}>
            {isApproved && <Tag color="success" style={{ margin: 0, fontSize: 11 }}>Согласовано</Tag>}
            {isRejected && <Tag color="error" style={{ margin: 0, fontSize: 11 }}>Отклонено</Tag>}
            {!isApproved && !isRejected && (
              <Tag style={{ margin: 0, fontSize: 11 }}>{approvalMeta?.approval_action}</Tag>
            )}
          </div>
          {approvalMeta?.comment && (
            <Paragraph
              style={{ margin: 0, fontSize: 12 }}
              type="secondary"
              ellipsis={{ rows: 1, expandable: true, symbol: 'еще' }}
            >
              {approvalMeta.comment}
            </Paragraph>
          )}
        </div>
      );

    case 'delete':
      if (metadata) {
        const deleteMeta = metadata as any;
        return (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {deleteMeta.invoice_number || deleteMeta.payment_number || deleteMeta.letter_number}
          </Text>
        );
      }
      return null;

    case 'view':
      // Просто отображаем факт просмотра без дополнительных деталей
      return null;

    default:
      return null;
  }
}

export default function AuditLogTimeline({
  auditLog,
  loading = false,
}: AuditLogTimelineProps) {
  const [letterStatuses, setLetterStatuses] = useState<Record<number, string>>({});
  const [statusesLoaded, setStatusesLoaded] = useState(false);

  // Load letter statuses if we have letter-related audit entries
  useEffect(() => {
    const hasLetterEntries = auditLog.some(entry => entry.entity_type === 'letter');
    const statusesAlreadyLoaded = Object.keys(letterStatuses).length > 0;
    
    if (hasLetterEntries && !statusesAlreadyLoaded && !statusesLoaded) {
      console.log('[AuditLogTimeline.useEffect] Loading letter statuses...');
      setStatusesLoaded(true);
      supabase
        .from('letter_statuses')
        .select('id, name')
        .then(({ data, error }) => {
          if (error) {
            console.error('[AuditLogTimeline.useEffect] Error loading statuses:', error);
          }
          if (data) {
            const statusMap = Object.fromEntries(
              data.map(status => [status.id, status.name])
            );
            console.log('[AuditLogTimeline.useEffect] Letter statuses loaded:', {
              count: data.length,
              statusMap
            });
            setLetterStatuses(statusMap);
          }
        });
    }
  }, [auditLog.length]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <Spin />
      </div>
    );
  }

  if (!auditLog || auditLog.length === 0) {
    return (
      <Empty
        description="История изменений пуста"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  // Wait for letter statuses to load if we have letter entries
  const hasLetterEntries = auditLog.some(entry => entry.entity_type === 'letter');
  if (hasLetterEntries && !statusesLoaded) {
    console.log('[AuditLogTimeline] Waiting for letter statuses to load...');
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <Spin tip="Загрузка статусов..." />
      </div>
    );
  }

  console.log('[AuditLogTimeline] Rendering timeline with:', {
    auditLogCount: auditLog.length,
    letterStatusesCount: Object.keys(letterStatuses).length,
    letterStatuses
  });

  const timelineItems = auditLog.map((entry) => {
    const config = actionConfig[entry.action];

    console.log('[AuditLogTimeline] Processing entry:', {
      action: entry.action,
      entity_type: entry.entity_type,
      field_name: entry.field_name,
      old_value: entry.old_value,
      new_value: entry.new_value,
      metadata: entry.metadata
    });

    return {
      key: entry.id,
      color: config.color as any,
      dot: config.icon,
      children: (
        <div style={{ paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Tag color={config.color} style={{ margin: 0, fontSize: 12 }}>
              {config.label}
            </Tag>
            <Tooltip title={dayjs(entry.created_at).format('DD.MM.YYYY HH:mm:ss')}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {dayjs(entry.created_at).fromNow()}
              </Text>
            </Tooltip>
            <Text type="secondary" style={{ fontSize: 11, marginLeft: 'auto' }}>
              {entry.user_name || entry.user_email}
            </Text>
          </div>

          <div style={{ fontSize: 13 }}>
            {renderActionDetails(entry, letterStatuses)}
          </div>
        </div>
      ),
    };
  });

  return <Timeline items={timelineItems} style={{ marginTop: 8 }} />;
}
