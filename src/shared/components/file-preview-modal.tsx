import { Modal, Spin, Alert, Button, Space } from 'antd';
import { 
  DownloadOutlined, 
  ExpandOutlined, 
  CloseOutlined,
  FileTextOutlined 
} from '@ant-design/icons';
import { useState, useEffect } from 'react';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  mimeType?: string;
}

export function FilePreviewModal({ 
  isOpen, 
  onClose, 
  fileUrl, 
  fileName,
  mimeType 
}: FilePreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
    }
  }, [isOpen]);

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleIframeError = () => {
    setLoading(false);
    setError('Не удалось загрузить файл для предпросмотра');
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.click();
  };

  const handleOpenInNewTab = () => {
    window.open(fileUrl, '_blank');
  };

  // Определяем, можно ли показать превью
  const canPreview = () => {
    if (!mimeType) return true; // Попробуем показать любой файл
    
    // PDF файлы
    if (mimeType.includes('pdf')) return true;
    
    // Изображения
    if (mimeType.startsWith('image/')) return true;
    
    // Текстовые файлы
    if (mimeType.includes('text')) return true;
    
    // Office документы (могут не отображаться в iframe, но попробуем)
    if (mimeType.includes('word') || 
        mimeType.includes('excel') || 
        mimeType.includes('powerpoint') ||
        mimeType.includes('officedocument')) {
      return true;
    }
    
    return false;
  };

  const renderPreview = () => {
    if (error) {
      return (
        <div style={{ 
          height: '60vh', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 16
        }}>
          <FileTextOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />
          <Alert
            message="Предпросмотр недоступен"
            description={error}
            type="warning"
            showIcon
            style={{ maxWidth: 400 }}
            action={
              <Space direction="vertical" style={{ width: '100%', marginTop: 12 }}>
                <Button 
                  block
                  icon={<DownloadOutlined />} 
                  onClick={handleDownload}
                >
                  Скачать файл
                </Button>
                <Button 
                  block
                  icon={<ExpandOutlined />} 
                  onClick={handleOpenInNewTab}
                >
                  Открыть в новой вкладке
                </Button>
              </Space>
            }
          />
        </div>
      );
    }

    if (mimeType?.startsWith('image/')) {
      // Для изображений используем img тег
      return (
        <div style={{ 
          height: '70vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          overflow: 'auto',
          padding: 16,
          background: '#f0f0f0'
        }}>
          <img 
            src={fileUrl} 
            alt={fileName}
            style={{ 
              maxWidth: '100%', 
              maxHeight: '100%',
              objectFit: 'contain',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        </div>
      );
    }

    // Для остальных файлов используем iframe
    return (
      <iframe
        src={fileUrl}
        title={fileName}
        style={{ 
          width: '100%', 
          height: '70vh', 
          border: 'none',
          background: '#fff'
        }}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
      />
    );
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{fileName}</span>
          <Space>
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={handleDownload}
              title="Скачать файл"
            />
            <Button
              type="text"
              icon={<ExpandOutlined />}
              onClick={handleOpenInNewTab}
              title="Открыть в новой вкладке"
            />
          </Space>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      width="90%"
      style={{ maxWidth: 1200 }}
      footer={[
        <Button key="close" onClick={onClose} icon={<CloseOutlined />}>
          Закрыть
        </Button>
      ]}
      centered
      destroyOnClose
    >
      {loading && canPreview() && (
        <div style={{ 
          height: '60vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <Spin size="large" tip="Загрузка файла..." />
        </div>
      )}
      
      {!canPreview() ? (
        <div style={{ 
          height: '60vh', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 16
        }}>
          <FileTextOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />
          <Alert
            message="Предпросмотр недоступен для данного типа файла"
            description={`Тип файла: ${mimeType || 'неизвестен'}`}
            type="info"
            showIcon
            style={{ maxWidth: 400 }}
            action={
              <Space direction="vertical" style={{ width: '100%', marginTop: 12 }}>
                <Button 
                  block
                  type="primary"
                  icon={<DownloadOutlined />} 
                  onClick={handleDownload}
                >
                  Скачать файл
                </Button>
                <Button 
                  block
                  icon={<ExpandOutlined />} 
                  onClick={handleOpenInNewTab}
                >
                  Открыть в новой вкладке
                </Button>
              </Space>
            }
          />
        </div>
      ) : (
        <div style={{ display: loading ? 'none' : 'block' }}>
          {renderPreview()}
        </div>
      )}
    </Modal>
  );
}