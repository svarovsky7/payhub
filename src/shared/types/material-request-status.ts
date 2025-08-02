export interface MaterialRequestStatus {
  id: number;
  code: string;
  name: string;
  description?: string;
  color: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMaterialRequestStatusData {
  code: string;
  name: string;
  description?: string;
  color?: string;
  order_index?: number;
  is_active?: boolean;
}

export interface UpdateMaterialRequestStatusData {
  name?: string;
  description?: string;
  color?: string;
  order_index?: number;
  is_active?: boolean;
}

// Базовые коды статусов
export const StatusCode = {
  DRAFT: 'draft',
  PENDING_MANAGER: 'pending_manager',
  PENDING_DIRECTOR: 'pending_director',
  APPROVED: 'approved',
  PAID: 'paid',
  REJECTED: 'rejected',
} as const;

export type StatusCode = typeof StatusCode[keyof typeof StatusCode];

// Цвета по умолчанию для статусов
export const DefaultStatusColors = {
  [StatusCode.DRAFT]: '#d9d9d9',
  [StatusCode.PENDING_MANAGER]: '#faad14',
  [StatusCode.PENDING_DIRECTOR]: '#722ed1',
  [StatusCode.APPROVED]: '#52c41a',
  [StatusCode.PAID]: '#1890ff',
  [StatusCode.REJECTED]: '#ff4d4f',
};