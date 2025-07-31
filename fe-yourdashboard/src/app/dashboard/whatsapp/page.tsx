'use client';

import React from 'react';
import { Menu, Avatar, Typography } from 'antd';
import { PlusOutlined, UserOutlined } from '@ant-design/icons';
import Link from 'next/link';

import Layout from 'antd/es/layout';
import Sider from 'antd/es/layout/Sider';

const { Content } = Layout;

import { accounts } from '@/components/Whatsapp/utils/data'; // ajusta según tu estructura

const { Title } = Typography;

export default function Home() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sider
        width={100}
        style={{
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '20px 0',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 1000,
          overflowY: 'auto',
          paddingTop: 20,
        }}
      >
        <Menu mode="inline" selectable={false}>
          {accounts.map((account) => (
            <Menu.Item key={account.id} style={{ textAlign: 'center', minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Link href={`whatsapp/${account.id}/conversations`}>
                <div>
                  <Avatar
                    style={{
                      backgroundColor: '#87d068',
                      width: 64,
                      height: 64,
                    }}
                    icon={<UserOutlined />}
                  />
                  <Typography.Text style={{ display: 'block', fontSize: 12 }}>
                    {account.name}
                  </Typography.Text>
                </div>
              </Link>
            </Menu.Item>
          ))}

          {/* Añadir cuenta */}
          <Menu.Item key="add" style={{ textAlign: 'center', minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div>
              <Avatar
                style={{
                  backgroundColor: '#1890ff',
                  marginBottom: 5,
                  width: 64,
                  height: 64,
                }}
                icon={<PlusOutlined />}
              />
            </div>
          </Menu.Item>
        </Menu>
      </Sider>

      {/* Main content */}
      <Content
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#fafafa',
        }}
      >
        <Title level={2} style={{ color: '#999' }}>
          Selecciona una cuenta
        </Title>
      </Content>
    </Layout>
  );
}
