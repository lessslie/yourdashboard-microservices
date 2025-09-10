"use client";

import React, { useState } from "react";
import { Layout } from "antd";
import SearchInterface from "./SearchInterface";
import SidebarMenu from "./SidebarMenu";
const { Sider, Content } = Layout;

const DashboardSearchPage = () => {
  const [activeMenuItem, setActiveMenuItem] = useState("buscador");

  const renderContent = () => {
    switch (activeMenuItem) {
      case "buscador":
        return <SearchInterface />;
      case "dashboard":
        return (
          <div
            style={{
              padding: "40px",
              fontFamily: "Montserrat, sans-serif",
              textAlign: "center",
              color: "#666666",
            }}
          >
            <h2>Dashboard</h2>
            <p>Esta sección estará disponible próximamente</p>
          </div>
        );
      default:
        return (
          <div
            style={{
              padding: "40px",
              fontFamily: "Montserrat, sans-serif",
              textAlign: "center",
              color: "#666666",
            }}
          >
            <h2>
              {activeMenuItem.charAt(0).toUpperCase() + activeMenuItem.slice(1)}
            </h2>
            <p>Esta sección estará disponible próximamente</p>
          </div>
        );
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", backgroundColor: "#fafafa" }}>
      <Sider
        width={260}
        style={{
          backgroundColor: "#ffffff",
          borderRight: "1px solid #e8e8e8",
          position: "fixed",
          height: "100vh",
          left: 0,
          top: 86,
          zIndex: 100,
          boxShadow: "0px 4px 15px 0px #BED8FF",
        }}
      >
        <SidebarMenu
          activeItem={activeMenuItem}
          onItemClick={setActiveMenuItem}
        />
      </Sider>

      <Layout style={{ marginLeft: 260 }}>
        <Content
          style={{
            backgroundColor: "#fafafa",
            minHeight: "calc(100vh - 86px)",
          }}
        >
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
};

export default DashboardSearchPage;
