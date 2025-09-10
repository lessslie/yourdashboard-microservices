"use client";

import React from "react";
import { Tabs, List, Pagination, Spin } from "antd";
import {
  MailOutlined,
  MessageOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { IGlobalSearchResponse } from "@/interfaces/interfacesSearch";

const { TabPane } = Tabs;

interface SearchResultsProps {
  results: IGlobalSearchResponse | null;
  loading: boolean;
  searchTerms: string[];
  onRemoveTag: (term: string) => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  loading,
  searchTerms,
}) => {
  if (loading) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "50px",
          fontFamily: "Montserrat, sans-serif",
        }}
      >
        <Spin size="large" />
        <div style={{ marginTop: "16px", color: "#666666" }}>Buscando...</div>
      </div>
    );
  }

  if (!results && searchTerms.length === 0) {
    return null;
  }

  if (!results || results.summary.totalResults === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "50px",
          fontFamily: "Montserrat, sans-serif",
        }}
      >
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              width: "200px",
              height: "150px",
              margin: "0 auto",
              background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.7,
              marginBottom: "20px",
            }}
          >
            <span style={{ fontSize: "48px" }}>😔</span>
          </div>
        </div>
        <h3
          style={{
            color: "#1F4788",
            marginBottom: "8px",
            fontFamily: "Montserrat, sans-serif",
            fontWeight: "600",
          }}
        >
          Sin resultados encontrados
        </h3>
        <p
          style={{
            color: "#666666",
            fontFamily: "Montserrat, sans-serif",
            lineHeight: "1.5",
          }}
        >
          No hemos podido encontrar nada que coincida con tu búsqueda.
          <br />
          Intenta con palabras clave diferentes
        </p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Montserrat, sans-serif" }}>
      {/* Results Header */}
      <div style={{ marginBottom: "20px" }}>
        <h3
          style={{
            color: "#1F4788",
            fontFamily: "Montserrat, sans-serif",
            marginBottom: "4px",
            fontWeight: "600",
          }}
        >
          Resultados para la búsqueda {searchTerms.join('" y "')}
        </h3>
      </div>

      {/* Results Tabs */}
      <Tabs
        defaultActiveKey="correo"
        style={{ fontFamily: "Montserrat, sans-serif" }}
        className="search-results-tabs"
      >
        <TabPane
          tab={
            <span
              style={{
                fontFamily: "Montserrat, sans-serif",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <MailOutlined />
              Correo
              <span
                style={{
                  color: "#999",
                  backgroundColor: "#f0f0f0",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              >
                {results.summary.resultsPerSource.emails}
              </span>
            </span>
          }
          key="correo"
        >
          <List
            dataSource={results.data.emails.results}
            renderItem={(item) => (
              <List.Item
                style={{
                  padding: "16px 0",
                  borderBottom: "1px solid #f0f0f0",
                  cursor: "pointer",
                  transition: "background-color 0.2s ease",
                }}
                className="search-result-item"
              >
                <div style={{ width: "100%" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: "4px" }}>
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#999",
                            fontFamily: "Montserrat, sans-serif",
                            fontWeight: "500",
                          }}
                        >
                          Remitente • Destinatario PROXIMAMENTE!!!
                        </span>
                      </div>
                      <h4
                        style={{
                          margin: "0 0 8px 0",
                          color: "#1F4788",
                          fontFamily: "Montserrat, sans-serif",
                          fontWeight: "600",
                          fontSize: "16px",
                        }}
                      >
                        {item.subject}
                      </h4>
                      <p
                        style={{
                          margin: 0,
                          color: "#666",
                          fontSize: "14px",
                          fontFamily: "Montserrat, sans-serif",
                          lineHeight: "1.4",
                        }}
                      >
                        Mensaje previo con la{" "}
                        <span
                          style={{
                            color: "#344BFF",
                            fontWeight: "bold",
                            backgroundColor: "#E8F0FF",
                            padding: "2px 4px",
                            borderRadius: "4px",
                          }}
                        >
                          palabra de la búsqueda
                        </span>{" "}
                        encontrada PROXIMAMENTE!!!
                      </p>
                    </div>
                    <div
                      style={{
                        color: "#999",
                        fontSize: "12px",
                        fontFamily: "Montserrat, sans-serif",
                        fontWeight: "500",
                      }}
                    >
                      Fecha/Hora
                    </div>
                  </div>
                </div>
              </List.Item>
            )}
          />
        </TabPane>

        <TabPane
          tab={
            <span
              style={{
                fontFamily: "Montserrat, sans-serif",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <MessageOutlined />
              Whatsapp
              <span
                style={{
                  color: "#999",
                  backgroundColor: "#f0f0f0",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              >
                {results.summary.resultsPerSource.whatsapp}
              </span>
            </span>
          }
          key="whatsapp"
        >
          <List
            dataSource={results.data.whatsapp.results}
            renderItem={(item) => (
              <List.Item
                style={{
                  padding: "16px 0",
                  borderBottom: "1px solid #f0f0f0",
                  cursor: "pointer",
                  transition: "background-color 0.2s ease",
                }}
                className="search-result-item"
              >
                <div style={{ width: "100%" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: "4px" }}>
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#999",
                            fontFamily: "Montserrat, sans-serif",
                            fontWeight: "500",
                          }}
                        >
                          Mensaje de: {item.from}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          color: "#666",
                          fontSize: "14px",
                          fontFamily: "Montserrat, sans-serif",
                          lineHeight: "1.4",
                        }}
                      >
                        {item.body}
                      </p>
                    </div>
                    <div
                      style={{
                        color: "#999",
                        fontSize: "12px",
                        fontFamily: "Montserrat, sans-serif",
                        fontWeight: "500",
                      }}
                    >
                      {new Date(item.timestamp * 1000).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </List.Item>
            )}
          />
        </TabPane>

        <TabPane
          tab={
            <span
              style={{
                fontFamily: "Montserrat, sans-serif",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <CalendarOutlined />
              Calendario
              <span
                style={{
                  color: "#999",
                  backgroundColor: "#f0f0f0",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              >
                {results.summary.resultsPerSource.calendar}
              </span>
            </span>
          }
          key="calendario"
        >
          <List
            dataSource={results.data.calendar.results}
            renderItem={(item) => (
              <List.Item
                style={{
                  padding: "16px 0",
                  borderBottom: "1px solid #f0f0f0",
                  cursor: "pointer",
                  transition: "background-color 0.2s ease",
                }}
                className="search-result-item"
              >
                <div style={{ width: "100%" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <h4
                        style={{
                          margin: "0 0 8px 0",
                          color: "#1F4788",
                          fontFamily: "Montserrat, sans-serif",
                          fontWeight: "600",
                          fontSize: "16px",
                        }}
                      >
                        {item.summary}
                      </h4>
                      <p
                        style={{
                          margin: 0,
                          color: "#666",
                          fontSize: "14px",
                          fontFamily: "Montserrat, sans-serif",
                          lineHeight: "1.4",
                        }}
                      >
                        {item.description || "Sin descripción"}
                      </p>
                    </div>
                    <div
                      style={{
                        color: "#999",
                        fontSize: "12px",
                        fontFamily: "Montserrat, sans-serif",
                        fontWeight: "500",
                      }}
                    >
                      {new Date(item.startTime).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </List.Item>
            )}
          />
        </TabPane>
      </Tabs>

      {/* Pagination */}
      <div style={{ textAlign: "center", marginTop: "30px" }}>
        <Pagination
          current={1}
          total={results.summary.totalResults}
          pageSize={10}
          showSizeChanger={false}
          style={{ fontFamily: "Montserrat, sans-serif" }}
        />
      </div>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap");

        .search-results-tabs .ant-tabs-tab {
          font-family: "Montserrat", sans-serif !important;
          font-weight: 500 !important;
        }

        .search-results-tabs .ant-tabs-tab-active {
          font-weight: 600 !important;
        }

        .search-result-item:hover {
          background-color: #f8f9fa !important;
          border-radius: 8px;
          padding-left: 12px !important;
          padding-right: 12px !important;
        }

        .ant-pagination .ant-pagination-item a,
        .ant-pagination .ant-pagination-prev .ant-pagination-item-link,
        .ant-pagination .ant-pagination-next .ant-pagination-item-link {
          font-family: "Montserrat", sans-serif !important;
        }
      `}</style>
    </div>
  );
};

export default SearchResults;
