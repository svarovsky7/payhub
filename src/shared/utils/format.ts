import dayjs from 'dayjs';

export const formatDate = (date: string | Date, format = 'MM/DD/YYYY') => {
  return dayjs(date).format(format);
};

export const formatDateTime = (date: string | Date) => {
  return dayjs(date).format('MM/DD/YYYY HH:mm');
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};