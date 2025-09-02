import { useEffect, useState } from "react";
import {
  getAllEmails,
  getAllSearchEmails,
  getEmails,
  getSearchEmails,
  postEmailSync,
} from "../../../services/emails/emails";
import { IDataEmail, IEmail, IEmailBack } from "@/interfaces/interfacesEmails";
import { ICuentaGmail } from "@/interfaces/interfacesAuth";
import { useAuthStore } from "@/store/authStore";

export const useEmails = (cuentasGmail: ICuentaGmail[], userId: number) => {
  const [initLoading, setInitLoading] = useState(true);
  const [viewAll, setViewAll] = useState(true);
  const { accessToken } = useAuthStore();

  const [list, setList] = useState<IDataEmail>({
    emails: [],
    hasNextPage: false,
    hasPreviousPage: false,
    limit: 10,
    page: 1,
    total: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedCuentaGmailId, setSelectedCuentaGmailId] = useState<
    string | null
  >(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const handleAccountChange = (cuentaGmailId: string) => {
    setSelectedCuentaGmailId(cuentaGmailId);
    setViewAll(false);
    setPage(1);
  };

  const handleSync = async (cuentaGmailId: string) => {
    setInitLoading(true);
    const token = accessToken;
    if (!token || !cuentaGmailId) return;

    try {
      await postEmailSync(token, cuentaGmailId);
      console.log("Sincronización iniciada");
      setInitLoading(false);
    } catch (error) {
      console.error("❌ Error al iniciar la sincronización:", error);
      setInitLoading(false);
    }
  };

  const handleViewAll = () => {
    setViewAll(true);
    setSelectedCuentaGmailId(null);
    setPage(1);
  };

  const handleSearchTermChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSearchTerm(event.target.value);
    setPage(1);
  };

  const handleCheck = async () => {
    const token = accessToken;
    if (!token || searchTerm === "") return;

    setInitLoading(true);
    try {
      let emails;
      if (viewAll) {
        emails = await getAllSearchEmails(
          token,
          String(userId),
          searchTerm,
          page,
          limit
        );
      } else {
        if (!selectedCuentaGmailId) return;
        emails = await getSearchEmails(
          token,
          selectedCuentaGmailId,
          searchTerm,
          page,
          limit
        );
      }
      const dataEmails = emails.data;

      setList({
        emails: dataEmails.emails.map(
          (email: IEmailBack): IEmail => ({
            id: email.id,
            name: email.fromName,
            from: email.fromEmail,
            subject: email.subject,
            date: email.receivedDate,
            read: email.isRead,
          })
        ),
        hasNextPage: dataEmails.hasNextPage,
        hasPreviousPage: dataEmails.hasPreviousPage,
        limit: dataEmails.limit,
        page: dataEmails.page,
        total: dataEmails.total,
        totalPages: dataEmails.totalPages,
      });
    } catch (error) {
      console.error("❌ Error al buscar emails:", error);
    } finally {
      setInitLoading(false);
    }
  };

  useEffect(() => {
    const token = accessToken;
    if (!token || !userId || searchTerm !== "") return;

    setInitLoading(true);

    const fetchEmails = async () => {
      try {
        let emails;
        if (viewAll) {
          emails = await getAllEmails(token, String(userId), page, limit);
        } else {
          if (!selectedCuentaGmailId) return;
          emails = await getEmails(token, selectedCuentaGmailId, page, limit);
        }

        const dataEmails = emails.data;

        setList({
          emails: dataEmails.emails.map(
            (email: IEmailBack): IEmail => ({
              id: email.id,
              name: email.fromName,
              from: email.fromEmail,
              subject: email.subject,
              date: email.receivedDate,
              read: email.isRead,
            })
          ),
          hasNextPage: dataEmails.hasNextPage,
          hasPreviousPage: dataEmails.hasPreviousPage,
          limit: dataEmails.limit,
          page: dataEmails.page,
          total: dataEmails.total,
          totalPages: dataEmails.totalPages,
        });
      } catch (error) {
        console.error("❌ Error fetching emails:", error);
      } finally {
        setInitLoading(false);
      }
    };

    fetchEmails();
  }, [
    page,
    limit,
    selectedCuentaGmailId,
    cuentasGmail,
    searchTerm,
    userId,
    viewAll,
  ]);
  useEffect(() => {
    if (cuentasGmail.length === 1) {
      const únicaCuenta = cuentasGmail[0];
      setSelectedCuentaGmailId(únicaCuenta.id);
      setViewAll(false);
    }
  }, [cuentasGmail]);

  useEffect(() => {
    if (searchTerm !== "") {
      handleCheck();
    }
  }, [page, limit]);

  return {
    initLoading,
    list,
    page,
    setPage,
    limit,
    setLimit,
    handleAccountChange,
    handleSync,
    selectedCuentaGmailId,
    setSelectedCuentaGmailId,
    handleSearchTermChange,
    handleCheck,
    searchTerm,
    handleViewAll,
    viewAll,
  };
};
