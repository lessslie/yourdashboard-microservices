import { IDataEmail, IEmail, IEmailBack } from "@/interfaces/interfacesEmails";
import { getAllEmails, getAllSearchEmails } from "@/services/emails/emails";
import { useEffect, useState } from "react";

export const useAllEmails = (userId: number) => {
  const [initLoading, setInitLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [list, setList] = useState<IDataEmail>({
    emails: [],
    hasNextPage: false,
    hasPreviousPage: false,
    limit: 10,
    page: 1,
    total: 0,
    totalPages: 0,
    accountsLoaded: [],
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const handleSearchTermChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSearchTerm(event.target.value);
    setPage(1);
  };
  const handleCheck = async () => {
    const token = localStorage.getItem("token");
    if (!token || !userId || searchTerm === "") return;

    setInitLoading(true);
    try {
      const response = await getAllSearchEmails(
        token,
        String(userId),
        searchTerm,
        page,
        limit
      );

      const emails = response.data;

      setList({
        emails: emails.emails.map(
          (email: IEmailBack): IEmail => ({
            id: email.id,
            name: email.fromName,
            from: email.fromEmail,
            subject: email.subject,
            date: email.receivedDate,
            read: email.isRead,
          })
        ),
        hasNextPage: emails.hasNextPage,
        hasPreviousPage: emails.hasPreviousPage,
        limit: emails.limit,
        page: emails.page,
        total: emails.total,
        totalPages: emails.totalPages,
        accountsLoaded: emails.accountsLoaded,
      });
    } catch (error) {
      console.error("❌ Error al buscar emails:", error);
    } finally {
      setInitLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !userId) return;

    if (searchTerm !== "") return;

    setInitLoading(true);
    if (token) {
      const fetchAllEmails = async () => {
        try {
          const emails = await getAllEmails(token, String(userId), page, limit);
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
      fetchAllEmails();
    }
  }, [page, limit, searchTerm, userId]);

  useEffect(() => {
    if (searchTerm !== "") {
      handleCheck();
    }
  }, [page, limit]);

  return {
    initLoading,
    list,
    page,
    limit,
    setPage,
    setLimit,
    searchTerm,
    handleSearchTermChange,
    handleCheck,
  };
};
