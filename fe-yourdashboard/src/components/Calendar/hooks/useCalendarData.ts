import { useState, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import {
  getCalendarEvents,
  getUnifiedCalendarEvents,
  searchCalendarEvents,
  searchUnifiedCalendarEvents,
} from "@/services/calendar/calendarService";
import { CalendarEvent } from "@/interfaces/interfacesCalendar";

export const useCalendarData = (accountId?: string, showUnified = false) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [searchResults, setSearchResults] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [searchTotal, setSearchTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const { userProfile, getActiveGmailAccount } = useAuthStore();

  const activeAccount = accountId
    ? userProfile?.cuentas_gmail?.find((acc) => acc.id.toString() === accountId)
    : getActiveGmailAccount();

  const loadEvents = useCallback(
    async (startDate: string, endDate: string, page = 1, limit = 100) => {
      if (!activeAccount && !showUnified) {
        setEvents([]);
        return;
      }

      setLoading(true);
      setError(null);
      setIsSearchMode(false);

      try {
        let data;

        if (showUnified && userProfile?.usuario?.id) {
          data = await getUnifiedCalendarEvents(
            userProfile.usuario.id.toString(),
            startDate,
            endDate,
            page,
            limit
          );
        } else if (activeAccount) {
          data = await getCalendarEvents(
            activeAccount.id.toString(),
            startDate,
            endDate,
            page,
            limit
          );
        }

        if (data) {
          setEvents(data.events || []);
          setTotal(data.total || 0);
          setCurrentPage(page);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando eventos");
        setEvents([]);
      } finally {
        setLoading(false);
      }
    },
    [activeAccount, showUnified, userProfile]
  );

  const searchEvents = useCallback(
    async (searchTerm: string, startDate: string, page = 1, limit = 50) => {
      if (!searchTerm.trim() || (!activeAccount && !showUnified)) {
        setSearchResults([]);
        setSearchTotal(0);
        setIsSearchMode(false);
        return;
      }

      setSearchLoading(true);
      setError(null);
      setIsSearchMode(true);

      try {
        let data;

        if (showUnified && userProfile?.usuario?.id) {
          data = await searchUnifiedCalendarEvents(
            userProfile.usuario.id.toString(),
            startDate,
            searchTerm,
            page,
            limit
          );
        } else if (activeAccount) {
          data = await searchCalendarEvents(
            activeAccount.id.toString(),
            startDate,
            searchTerm,
            page,
            limit
          );
        }

        if (data) {
          setSearchResults(data.events || []);
          setSearchTotal(data.total || 0);
          setCurrentPage(page);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error buscando eventos");
        setSearchResults([]);
        setSearchTotal(0);
      } finally {
        setSearchLoading(false);
      }
    },
    [activeAccount, showUnified, userProfile]
  );

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSearchTotal(0);
    setIsSearchMode(false);
    setError(null);
  }, []);

  const getCurrentEvents = useCallback(() => {
    return isSearchMode ? searchResults : events;
  }, [isSearchMode, searchResults, events]);

  const getCurrentTotal = useCallback(() => {
    return isSearchMode ? searchTotal : total;
  }, [isSearchMode, searchTotal, total]);

  const isLoading = loading || searchLoading;

  return {
    events: getCurrentEvents(),
    loading: isLoading,
    error,
    total: getCurrentTotal(),
    currentPage,

    searchResults,
    searchLoading,
    searchTotal,
    isSearchMode,

    loadEvents,
    searchEvents,
    clearSearch,

    hasAccount: !!activeAccount || showUnified,
    accountInfo: activeAccount,

    normalEvents: events,
    normalTotal: total,
    normalLoading: loading,
  };
};
