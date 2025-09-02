import axios from "axios";
export const MS_ORCHES_URL =
  process.env.NEXT_PUBLIC_MS_ORCHESTRATOR_URL || "http://localhost:3003";

export const handleConnectService = async (token: string) => {
  try {
    const authUrl = `${MS_ORCHES_URL}/auth/google?token=${encodeURIComponent(
      token
    )}&service=gmail`;
    window.location.href = authUrl;
  } catch (error) {
    console.error("❌ Error iniciando OAuth:", error);
  }
};

export const getAllEmails = async (
  token: string,
  userId: string,
  page: number,
  limit: number
) => {
  try {
    const response = await axios.get(
      `${MS_ORCHES_URL}/emails/inbox-all-accounts`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          userId,
          page,
          limit,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(error);
  }
};

export const getEmails = async (
  token: string,
  cuentaGmailId: string,
  page: number,
  limit: number
) => {
  try {
    const response = await axios.get(`${MS_ORCHES_URL}/emails/inbox`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        cuentaGmailId,
        page,
        limit,
      },
    });
    return response.data;
  } catch (error) {
    console.error(error);
  }
};

export const getAllSearchEmails = async (
  token: string,
  userId: string,
  searchTerm: string,
  page: number,
  limit: number
) => {
  try {
    const response = await axios.get(
      `${MS_ORCHES_URL}/emails/search-all-accounts`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          userId,
          q: searchTerm,
          page,
          limit,
        },
      }
    );
    console.log("response.data", response.data);
    return response.data;
  } catch (error) {
    console.error(error);
  }
};

export const getSearchEmails = async (
  token: string,
  cuentaGmailId: string,
  searchTerm: string,
  page?: number,
  limit?: number
) => {
  try {
    const response = await axios.get(`${MS_ORCHES_URL}/emails/search`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        cuentaGmailId,
        q: searchTerm,
        page,
        limit,
      },
    });
    return response.data;
  } catch (error) {
    console.error(error);
  }
};

export const getEmailDetails = async (token: string, emailId: string) => {
  try {
    const response = await axios.get(`${MS_ORCHES_URL}/emails/${emailId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error(error);
  }
};

export const postEmailSync = async (token: string, cuentaGmailId: string) => {
  console.log("cuentaGmailId", cuentaGmailId);

  try {
    const response = await axios.post(
      `${MS_ORCHES_URL}/emails/sync/incremental`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          cuentaGmailId,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error sincronizando email:", error);
  }
};
