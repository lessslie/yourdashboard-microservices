"use client";

import React from "react";
import { Menu, Avatar, Typography } from "antd";
import { PlusOutlined, UserOutlined } from "@ant-design/icons";
import Link from "next/link";

import Layout from "antd/es/layout";
import Sider from "antd/es/layout/Sider";

const { Content } = Layout;

import { accounts } from "@/components/Whatsapp/utils/data";

const { Title } = Typography;

export default function Home() {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        width={100}
        style={{
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          padding: "20px 0",
          position: "fixed",
          marginTop: 45,
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 1000,
          overflowY: "auto",
        }}
      >
        <Menu mode="inline" selectable={false}>
          {accounts.map((account) => (
            <Menu.Item
              key={account.id}
              style={{
                textAlign: "center",
                minHeight: 100,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Link href={`whatsapp/${account.id}/conversations`}>
                <div>
                  <Avatar
                    style={{
                      backgroundColor: "rgba(222, 125, 103, 0.78)",
                      width: 64,
                      height: 64,
                    }}
                    icon={<UserOutlined />}
                  />
                  <Typography.Text style={{ display: "block", fontSize: 12 }}>
                    {account.name}
                  </Typography.Text>
                </div>
              </Link>
            </Menu.Item>
          ))}

          <Menu.Item
            key="add"
            style={{
              textAlign: "center",
              minHeight: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div>
              <Avatar
                style={{
                  backgroundColor: "#188fff69",
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

      <Content
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#fafafa",
        }}
      >
        <Title level={2} style={{ color: "#999" }}>
          Selecciona una cuenta
        </Title>
      </Content>
    </Layout>
  );
}
