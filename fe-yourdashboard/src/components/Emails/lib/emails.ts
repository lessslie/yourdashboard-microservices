import axios from "axios";

const MS_EMAILS_URL =
  process.env.NEXT_PUBLIC_MS_ORCHESTRATOR_URL || "http://localhost:3001";

export const getEmails = async (
  token: string,
  userId: string,
  page: number,
  limit: number
) => {
  try {
    const response = await axios.get(`${MS_EMAILS_URL}/emails/inbox`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        userId,
        page,
        limit,
      },
    });
    return response.data;
  } catch (error) {
    console.error(error);
  }
};
