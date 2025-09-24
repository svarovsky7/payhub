import { Modal, Form, Input, InputNumber, Select, DatePicker, Row, Col, Upload, Button, message } from 'antd'
import { UploadOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload/interface'
import dayjs from 'dayjs'
import type { Contract } from '../../services/contractOperations'

interface ContractFormModalProps {
  visible: boolean
  editingContract: Contract | null
  form: any
  contractors: any[]
  onSubmit: (values: any) => void
  onCancel: () => void
  fileList: UploadFile[]
  onFileChange: (info: any) => void
  onFileRemove: (file: UploadFile) => boolean | Promise<boolean>
  onFilePreview: (file: UploadFile) => void
}

export const ContractFormModal: React.FC<ContractFormModalProps> = ({
  visible,
  editingContract,
  form,
  contractors,
  onSubmit,
  onCancel,
  fileList,
  onFileChange,
  onFileRemove,
  onFilePreview
}) => {
  return (
    <Modal
      title={editingContract ? 'Редактировать договор' : 'Создать договор'}
      open={visible}
      onCancel={onCancel}
      onOk={() => form.submit()}
      width={800}
      okText={editingContract ? 'Сохранить' : 'Создать'}
      cancelText="Отмена"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="contract_number"
              label="Номер договора"
              rules={[{ required: true, message: 'Введите номер договора' }]}
            >
              <Input placeholder="Например: 123/2024" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="contract_date"
              label="Дата договора"
              rules={[{ required: true, message: 'Выберите дату договора' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                format="DD.MM.YYYY"
                placeholder="Выберите дату"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="payer_id"
              label="Плательщик"
            >
              <Select
                placeholder="Выберите плательщика"
                showSearch
                optionFilterProp="children"
                allowClear
              >
                {contractors.map(contractor => (
                  <Select.Option key={contractor.id} value={contractor.id}>
                    {contractor.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="supplier_id"
              label="Поставщик"
            >
              <Select
                placeholder="Выберите поставщика"
                showSearch
                optionFilterProp="children"
                allowClear
              >
                {contractors.map(contractor => (
                  <Select.Option key={contractor.id} value={contractor.id}>
                    {contractor.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="vat_rate"
              label="Ставка НДС (%)"
              initialValue={20}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                max={100}
                placeholder="20"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="warranty_period_days"
              label="Гарантийный срок (дней)"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                placeholder="365"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="description"
          label="Описание"
        >
          <Input.TextArea
            rows={3}
            placeholder="Краткое описание договора"
          />
        </Form.Item>

        <Form.Item label="Файлы договора">
          <Upload
            fileList={fileList}
            customRequest={({ onSuccess }) => {
              setTimeout(() => onSuccess?.('ok'), 0)
            }}
            onChange={onFileChange}
            onRemove={onFileRemove}
            onPreview={onFilePreview}
            multiple
          >
            <Button icon={<UploadOutlined />}>
              Выбрать файлы
            </Button>
          </Upload>
          {fileList.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
              {editingContract
                ? 'Файлы будут загружены после сохранения'
                : 'Файлы будут загружены после создания договора'}
            </div>
          )}
        </Form.Item>
      </Form>
    </Modal>
  )
}