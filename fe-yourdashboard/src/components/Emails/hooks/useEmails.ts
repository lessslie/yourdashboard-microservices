import { useEffect, useState } from "react";
import { getEmails, getSearchEmails } from "../lib/emails";
import { ICuentaGmail } from "@/components/Auth/hooks/useAuth";

export interface IEmailBack {
  id: string;
  messageId: string;
  subject: string;
  fromEmail: string;
  fromName: string;
  receivedDate: string;
  isRead: false;
  hasAttachments: false;
}

export interface IDataEmail {
  emails: IEmail[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  limit: number;
  page: number;
  total: number;
  totalPages: number;
}

export interface IEmail {
  id: string;
  name: string;
  from: string;
  to?: string[];
  subject: string;
  body?: string;
  date: string;
  read?: boolean;
}

export const useEmails = (cuentasGmail: ICuentaGmail[]) => {
  const [initLoading, setInitLoading] = useState(true);
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

  useEffect(() => {
    if (cuentasGmail.length > 0 && !selectedCuentaGmailId) {
      setSelectedCuentaGmailId(cuentasGmail[0].id);
    }
  }, [cuentasGmail, selectedCuentaGmailId]);

  const handleAccountChange = (cuentaGmailId: string) => {
    setSelectedCuentaGmailId(cuentaGmailId);
    setPage(1);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const fetchEmails = async () => {
        try {
          setInitLoading(true);
          const emails = await getEmails(
            token,
            selectedCuentaGmailId || cuentasGmail[0].id,
            page,
            limit
          );
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
    }
  }, [page, cuentasGmail, limit, selectedCuentaGmailId]);

  return {
    initLoading,
    list,
    page,
    setPage,
    limit,
    setLimit,
    handleAccountChange,
    selectedCuentaGmailId,
    setSelectedCuentaGmailId,
  };
};

export const useEmailSearch = (cuentaGmailId: string) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [emails, setEmails] = useState<IDataEmail>({
    emails: [],
    hasNextPage: false,
    hasPreviousPage: false,
    limit: 10,
    page: 1,
    total: 0,
    totalPages: 0,
  });

  const handleSearchTermChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSearchTerm(event.target.value);
  };

  const handleCheck = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      const response = await getSearchEmails(token, cuentaGmailId, searchTerm);
      const emails = response.data;
      console.log("✅ Emails response:", emails);
      if (searchTerm !== "") {
        return setEmails({
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
        });
      } else {
        return setEmails({
          emails: [],
          hasNextPage: false,
          hasPreviousPage: false,
          limit: 10,
          page: 1,
          total: 0,
          totalPages: 0,
        });
      }
    }
  };

  return {
    searchTerm,
    emails,
    handleCheck,
    setSearchTerm,
    handleSearchTermChange,
  };
};
