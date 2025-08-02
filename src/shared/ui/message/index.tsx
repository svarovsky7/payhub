import React from 'react';
import { App } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';

let messageApi: MessageInstance;

export const setupMessage = (api: MessageInstance) => {
  messageApi = api;
};

export const message = {
  success: (content: string) => messageApi?.success(content),
  error: (content: string) => messageApi?.error(content),
  info: (content: string) => messageApi?.info(content),
  warning: (content: string) => messageApi?.warning(content),
  loading: (content: string) => messageApi?.loading(content),
};

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { message: antdMessage } = App.useApp();
  
  React.useEffect(() => {
    setupMessage(antdMessage);
  }, [antdMessage]);
  
  return <>{children}</>;
};