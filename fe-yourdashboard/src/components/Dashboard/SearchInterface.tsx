"use client";

import React, { useState } from "react";
import { Input, Button, Tag } from "antd";
import { SearchOutlined, CloseOutlined } from "@ant-design/icons";
// import Image from "next/image";
import { globalSearch } from "@/services/search/searchService";
import { IGlobalSearchResponse } from "@/interfaces/interfacesSearch";
import SearchResults from "./SearchResults";

const { Search } = Input;

const SearchInterface = () => {
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<IGlobalSearchResponse | null>(null);

  const handleSearch = async () => {
    if (!currentInput.trim()) return;

    const newTerms = [...searchTerms, currentInput.trim()];
    setSearchTerms(newTerms);
    setCurrentInput("");
    setLoading(true);

    try {
      const searchQuery = newTerms.join(" ");
      const searchResults = await globalSearch(searchQuery);
      setResults(searchResults);
    } catch (error) {
      console.error("Error en búsqueda:", error);
      setResults({
        success: false,
        source: "error",
        searchTerm: currentInput,
        data: {
          emails: { results: [], total: 0 },
          calendar: { results: [], total: 0 },
          whatsapp: { results: [], total: 0 },
        },
        summary: {
          totalResults: 0,
          resultsPerSource: { emails: 0, calendar: 0, whatsapp: 0 },
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTag = (termToRemove: string) => {
    const newTerms = searchTerms.filter((term) => term !== termToRemove);
    setSearchTerms(newTerms);

    if (newTerms.length === 0) {
      setResults(null);
    } else {
      setLoading(true);
      const searchQuery = newTerms.join(" ");
      globalSearch(searchQuery)
        .then(setResults)
        .catch(() =>
          setResults({
            success: false,
            source: "error",
            searchTerm: searchQuery,
            data: {
              emails: { results: [], total: 0 },
              calendar: { results: [], total: 0 },
              whatsapp: { results: [], total: 0 },
            },
            summary: {
              totalResults: 0,
              resultsPerSource: { emails: 0, calendar: 0, whatsapp: 0 },
            },
          })
        )
        .finally(() => setLoading(false));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const showingResults = results !== null || searchTerms.length > 0;

  return (
    <div style={{ padding: "40px", fontFamily: "Montserrat, sans-serif" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1
            style={{
              fontSize: "40px",
              fontWeight: "600",
              color: "#1F4788",
              marginBottom: "12px",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            Búsqueda Global
          </h1>
          <p
            style={{
              fontSize: "16px",
              color: "#666666",
              marginBottom: "40px",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            Busca en tus Emails, Calendario y Whatsapp desde un solo lugar
          </p>

          {!showingResults && (
            <div style={{ marginBottom: "40px" }}>
              <div
                style={{
                  width: "300px",
                  height: "200px",
                  margin: "0 auto",
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0.8,
                }}
              >
                <SearchOutlined style={{ fontSize: "48px", color: "white" }} />
              </div>
            </div>
          )}
        </div>

        {searchTerms.length > 0 && (
          <div
            style={{
              marginBottom: "20px",
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            {searchTerms.map((term) => (
              <Tag
                key={term}
                closable
                onClose={() => handleRemoveTag(term)}
                closeIcon={<CloseOutlined />}
                style={{
                  backgroundColor: "#E8F0FF",
                  border: "1px solid #344BFF",
                  color: "#344BFF",
                  borderRadius: "20px",
                  padding: "4px 12px",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {term}
              </Tag>
            ))}
          </div>
        )}

        <div style={{ marginBottom: "30px" }}>
          <Search
            placeholder='Buscar "Reunion de hoy" o "Factura de..."'
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyPress={handleKeyPress}
            onSearch={handleSearch}
            enterButton={
              <Button
                type="primary"
                icon={<SearchOutlined />}
                style={{
                  backgroundColor: "#344BFF",
                  borderColor: "#344BFF",
                  fontFamily: "Montserrat, sans-serif",
                  height: "40px",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Buscar
              </Button>
            }
            size="large"
            style={{
              fontFamily: "Montserrat, sans-serif",
            }}
            className="custom-search"
          />
        </div>

        <SearchResults
          results={results}
          loading={loading}
          searchTerms={searchTerms}
          onRemoveTag={handleRemoveTag}
        />
      </div>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap");

        * {
          font-family: "Montserrat", sans-serif !important;
        }

        .custom-search .ant-input {
          font-family: "Montserrat", sans-serif !important;
          height: 40px !important;
          border-radius: 8px 0 0 8px !important;
        }

        .custom-search .ant-btn {
          border-radius: 0 8px 8px 0 !important;
        }

        .custom-search .ant-input::placeholder {
          font-family: "Montserrat", sans-serif !important;
        }
      `}</style>
    </div>
  );
};

export default SearchInterface;
