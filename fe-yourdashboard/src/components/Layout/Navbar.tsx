"use client";

import React from "react";
import { Layout, Button, Dropdown, Avatar, Space } from "antd";
import {
  UserOutlined,
  DownOutlined,
  LogoutOutlined,
  LoginOutlined,
} from "@ant-design/icons";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import type { MenuProps } from "antd";
import Link from "next/link";

const { Header } = Layout;

const Navbar = () => {
  const router = useRouter();
  const { userProfile, accessToken, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    router.push("/");
  };

  const handleLogin = () => {
    router.push("/auth");
  };

  const isLoggedIn = !!accessToken;

  const loggedInItems: MenuProps["items"] = [
    {
      key: "1",
      label: "Perfil",
      icon: <UserOutlined />,
      disabled: true,
    },
    {
      type: "divider",
    },
    {
      key: "2",
      label: "Cerrar sesión",
      icon: <LogoutOutlined />,
      onClick: handleLogout,
      danger: true,
    },
  ];

  const loggedOutItems: MenuProps["items"] = [
    {
      key: "1",
      label: "Iniciar sesión",
      icon: <LoginOutlined />,
      onClick: handleLogin,
    },
  ];

  const items = isLoggedIn ? loggedInItems : loggedOutItems;
  const userName = userProfile?.usuario?.nombre || "Invitado";

  return (
    <Header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        width: "100%",
        maxWidth: "1440px",
        height: "86px",
        margin: "0 auto",
        background: "#FFFFFF",
        boxShadow: "0px 4px 15px 0px #BED8FF",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
      }}
    >
      {/* Logo */}
      <Link href="/dashboard" style={{ display: "flex", alignItems: "center" }}>
        <div
          className="logo"
          style={{
            display: "flex",
            alignItems: "center",
            marginInlineStart: "16px",
          }}
        >
          <Image
            src="/Nombre=Horizontal.png"
            alt="Logo"
            width={100}
            height={30}
            style={{
              display: "flex",
              alignItems: "center",
              objectFit: "contain",
            }}
            priority
          />
        </div>
      </Link>

      <div className="user-section">
        <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
          <Button
            type="text"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              right: "16px",
              height: "auto",
              padding: "8px 16px",
              border: "1px solid #e8e8e8",
              borderRadius: "6px",
              backgroundColor: isLoggedIn ? "#fafafa" : "#f6ffed",
              transition: "all 0.2s ease",
            }}
          >
            <Space>
              <Avatar
                size="small"
                icon={<UserOutlined />}
                style={{
                  backgroundColor: isLoggedIn ? "#1890ff" : "#52c41a",
                }}
              />
              <span style={{ fontWeight: 500, color: "#262626" }}>
                {userName}
              </span>
              <DownOutlined style={{ fontSize: "12px", color: "#8c8c8c" }} />
            </Space>
          </Button>
        </Dropdown>
      </div>

      <style jsx global>{`
        .ant-layout-header {
          padding: 0 !important;
        }

        .user-section .ant-btn:hover {
          background-color: #f0f0f0 !important;
          border-color: #d9d9d9 !important;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .logo img {
          max-height: 50px;
          width: auto;
        }

        .ant-dropdown-menu-item-danger {
          color: #ff4d4f !important;
        }

        .ant-dropdown-menu-item-danger:hover {
          background-color: #fff2f0 !important;
        }

        @media (max-width: 768px) {
          .navbar-header {
            padding: 0 16px !important;
          }

          .logo img {
            max-height: 40px;
            width: 150px;
          }
        }

        @media (max-width: 480px) {
          .logo img {
            max-height: 35px;
            width: 120px;
          }

          .user-section .ant-btn {
            padding: 6px 12px !important;
            font-size: 14px;
          }
        }
      `}</style>
    </Header>
  );
};

export default Navbar;
