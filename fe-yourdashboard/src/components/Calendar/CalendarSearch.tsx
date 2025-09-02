import React, { useState } from "react";
import { Input, Button } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useCalendarData } from "./hooks/useCalendarData";
import { SearchResultsModal } from "./SearchResultsModal";
import { CalendarEvent } from "@/interfaces/interfacesCalendar";
import dayjs from "dayjs";

const { Search } = Input;

interface CalendarSearchProps {
  accountId?: string;
  showUnified?: boolean;
  onEventSelect?: (event: CalendarEvent) => void;
  placeholder?: string;
  className?: string;
}

export const CalendarSearch: React.FC<CalendarSearchProps> = ({
  accountId,
  showUnified = false,
  onEventSelect,
  placeholder = "Buscar eventos por título, descripción, ubicación...",
  className,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [lastSearchTerm, setLastSearchTerm] = useState("");

  const { events, searchLoading, searchEvents, clearSearch } = useCalendarData(
    accountId,
    showUnified
  );

  // Función para ejecutar la búsqueda
  const performSearch = async (term: string) => {
    if (!term) {
      clearSearch();
      setModalVisible(false);
      return;
    }

    try {
      const startDate = dayjs()
        .subtract(1, "year")
        .startOf("day")
        .toISOString();
      await searchEvents(term, startDate, 1, 50);
      setLastSearchTerm(term);
      setModalVisible(true);
    } catch (error) {
      console.error("Error en búsqueda:", error);
    }
  };

  // 1. Manejar el cambio en el input (solo actualiza el estado)
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (!value) {
      clearSearch();
      setModalVisible(false);
    }
  };

  const handleSearch = (value: string) => {
    const termToSearch = value.trim();
    performSearch(termToSearch);
  };

  const handleEventSelect = (event: CalendarEvent) => {
    setModalVisible(false);
    setSearchTerm("");
    if (onEventSelect) {
      onEventSelect(event);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  return (
    <>
      <div className={`calendar-search ${className}`}>
        <Search
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleSearchChange}
          onSearch={handleSearch}
          loading={searchLoading}
          allowClear
          size="large"
          enterButton={<Button icon={<SearchOutlined />} />}
        />
      </div>

      <SearchResultsModal
        visible={modalVisible}
        onCancel={handleCloseModal}
        searchTerm={lastSearchTerm}
        results={events}
        loading={searchLoading}
        onEventSelect={handleEventSelect}
        showUnified={showUnified}
      />
    </>
  );
};
