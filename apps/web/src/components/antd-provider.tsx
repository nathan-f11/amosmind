'use client';

import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider, theme } from 'antd';
import type { ReactNode } from 'react';

interface AntdProviderProps {
  children: ReactNode;
}

/**
 * Ant Design 全局 Provider（SSR 样式 + 暗色主题）
 * @author Cursor AI
 */
export function AntdProvider({ children }: AntdProviderProps) {
  return (
    <AntdRegistry>
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorPrimary: '#7c3aed',
            colorBgContainer: '#18181b',
            borderRadius: 8,
          },
        }}
      >
        {children}
      </ConfigProvider>
    </AntdRegistry>
  );
}
