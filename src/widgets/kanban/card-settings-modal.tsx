import { useState, useEffect } from 'react';
import { Modal, Checkbox, Button, Space, Typography, Divider, Switch } from 'antd';
import { SettingOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';

const { Text } = Typography;

export interface CardFieldSettings {
  invoiceNumber: boolean;
  amount: boolean;
  contractor: boolean;
  project: boolean;
  date: boolean;
  description: boolean;
  creator: boolean;
  updatedTime: boolean;
  priority: boolean;
  urgency: boolean;
  payer: boolean;
  vatInfo: boolean;
}

interface CardSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (settings: CardFieldSettings) => void;
  currentSettings: CardFieldSettings;
}

const DEFAULT_SETTINGS: CardFieldSettings = {
  invoiceNumber: true,
  amount: true,
  contractor: true,
  project: false,
  date: true,
  description: false,
  creator: false,
  updatedTime: true,
  priority: true,
  urgency: true,
  payer: false,
  vatInfo: false,
};

export function CardSettingsModal({ 
  open, 
  onClose, 
  onSave, 
  currentSettings 
}: CardSettingsModalProps) {
  const [settings, setSettings] = useState<CardFieldSettings>(currentSettings);
  const [compactMode, setCompactMode] = useState(false);

  useEffect(() => {
    setSettings(currentSettings);
    // Load compact mode from localStorage
    const savedCompactMode = localStorage.getItem('kanban-compact-mode');
    setCompactMode(savedCompactMode === 'true');
  }, [currentSettings]);

  const handleFieldChange = (field: keyof CardFieldSettings) => (e: CheckboxChangeEvent) => {
    setSettings(prev => ({
      ...prev,
      [field]: e.target.checked
    }));
  };

  const handleSave = () => {
    onSave(settings);
    localStorage.setItem('kanban-compact-mode', compactMode.toString());
    onClose();
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  const handleSelectAll = () => {
    setSettings({
      invoiceNumber: true,
      amount: true,
      contractor: true,
      project: true,
      date: true,
      description: true,
      creator: true,
      updatedTime: true,
      priority: true,
      urgency: true,
      payer: true,
      vatInfo: true,
    });
  };

  const handleSelectMinimal = () => {
    setSettings({
      invoiceNumber: true,
      amount: true,
      contractor: true,
      project: false,
      date: false,
      description: false,
      creator: false,
      updatedTime: false,
      priority: true,
      urgency: false,
      payer: false,
      vatInfo: false,
    });
  };

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          <span>Настройка карточек канбан</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={500}
      footer={[
        <Button key="reset" onClick={handleReset}>
          <ReloadOutlined /> Сбросить
        </Button>,
        <Button key="cancel" onClick={onClose}>
          Отмена
        </Button>,
        <Button key="save" type="primary" onClick={handleSave} icon={<SaveOutlined />}>
          Сохранить
        </Button>,
      ]}
    >
      <div style={{ marginBottom: 20 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ 
            padding: '12px', 
            background: '#f5f5f5', 
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
              <div>
                <Text strong>Компактный режим</Text>
                <div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Уменьшенный размер карточек для большей вместимости
                  </Text>
                </div>
              </div>
              <Switch 
                checked={compactMode} 
                onChange={setCompactMode}
              />
            </Space>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Space>
              <Button size="small" onClick={handleSelectAll}>
                Все поля
              </Button>
              <Button size="small" onClick={handleSelectMinimal}>
                Минимум
              </Button>
            </Space>
          </div>
        </Space>
      </div>

      <Divider orientation="left">Основные поля</Divider>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Checkbox 
          checked={settings.invoiceNumber} 
          onChange={handleFieldChange('invoiceNumber')}
          disabled
        >
          <Text strong>Номер счета</Text> <Text type="secondary">(обязательно)</Text>
        </Checkbox>
        
        <Checkbox 
          checked={settings.amount} 
          onChange={handleFieldChange('amount')}
        >
          <Text strong>Сумма</Text>
        </Checkbox>
        
        <Checkbox 
          checked={settings.contractor} 
          onChange={handleFieldChange('contractor')}
        >
          <Text strong>Поставщик</Text>
        </Checkbox>

        <Checkbox 
          checked={settings.payer} 
          onChange={handleFieldChange('payer')}
        >
          <Text strong>Плательщик</Text>
        </Checkbox>
        
        <Checkbox 
          checked={settings.project} 
          onChange={handleFieldChange('project')}
        >
          <Text strong>Проект</Text>
        </Checkbox>
      </Space>

      <Divider orientation="left">Дополнительные поля</Divider>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Checkbox 
          checked={settings.date} 
          onChange={handleFieldChange('date')}
        >
          <Text>Дата счета</Text>
        </Checkbox>
        
        <Checkbox 
          checked={settings.description} 
          onChange={handleFieldChange('description')}
        >
          <Text>Описание</Text>
        </Checkbox>

        <Checkbox 
          checked={settings.vatInfo} 
          onChange={handleFieldChange('vatInfo')}
        >
          <Text>Информация о НДС</Text>
        </Checkbox>
      </Space>

      <Divider orientation="left">Индикаторы и метаданные</Divider>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Checkbox 
          checked={settings.priority} 
          onChange={handleFieldChange('priority')}
        >
          <Text>Индикатор приоритета</Text>
        </Checkbox>
        
        <Checkbox 
          checked={settings.urgency} 
          onChange={handleFieldChange('urgency')}
        >
          <Text>Срочность (время в статусе)</Text>
        </Checkbox>
        
        <Checkbox 
          checked={settings.creator} 
          onChange={handleFieldChange('creator')}
        >
          <Text>Автор</Text>
        </Checkbox>
        
        <Checkbox 
          checked={settings.updatedTime} 
          onChange={handleFieldChange('updatedTime')}
        >
          <Text>Время обновления</Text>
        </Checkbox>
      </Space>

      <Divider />
      <Text type="secondary" style={{ fontSize: '12px' }}>
        Настройки сохраняются для текущего браузера
      </Text>
    </Modal>
  );
}