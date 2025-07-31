// app/whatsapp/layout.tsx
'use client';

import React from 'react';
import { Menu, Avatar, Typography, Layout } from 'antd';
import { PlusOutlined, UserOutlined } from '@ant-design/icons';
import Link from 'next/link';

import { accounts } from '@/components/Whatsapp/utils/data';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function WhatsappLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout style={{ minHeight: '100vh', height: '100vh', overflow: 'hidden' }}>
      <Header style={{
        background: "#fff",
        padding: "0 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        height: 64,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h1 style={{ margin: 0, color: "#299feeff" }}>📱 WhatsApp</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        </div>
      </Header>
      <Layout style={{
        position: 'absolute',
        top: 64,
        left: 0,
        right: 0,
        bottom: 0,
        height: 'calc(100vh - 64px)',
        minHeight: 0,
        background: '#fafafa',
        overflow: 'hidden',
      }}>
        <Sider
          width={100}
          style={{
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '20px 0',
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            height: '100%',
            minHeight: 0,
            overflowY: 'auto',
            zIndex: 1000,
          }}
        >
          <Menu mode="inline" selectable={false}>
            {accounts.map((account) => (
              <Menu.Item
                key={account.id}
                style={{
                  textAlign: 'center',
                  minHeight: 100,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Link href={`/whatsapp/${account.id}/conversations`}>
                  <div>
                    <Avatar
                      style={{ backgroundColor: '#87d068', width: 64, height: 64 }}
                      icon={<UserOutlined />}
                    />
                    <Text style={{ display: 'block', fontSize: 12 }}>{account.name}</Text>
                  </div>
                </Link>
              </Menu.Item>
            ))}

            <Menu.Item
              key="add"
              style={{
                textAlign: 'center',
                minHeight: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div>
                <Avatar
                  style={{ backgroundColor: '#1890ff', width: 64, height: 64 }}
                  icon={<PlusOutlined />}
                />
              </div>
            </Menu.Item>
          </Menu>
        </Sider>
        <Content style={{
          marginLeft: 'calc(100px )',
          padding: 0,
          height: '100%',
          minHeight: 0,
          overflow: 'hidden',
          background: '#fafafa',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}
