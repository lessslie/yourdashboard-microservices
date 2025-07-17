import { useEffect, useState } from "react";
import { getUserData } from "../lib/auth";

export const useAuth = () => {
  const [token, setToken] = useState("");
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      setToken(token);
    }
  }, []);

  const saveToken = (token: string) => {
    localStorage.setItem("token", token);
    setToken(token);
  };

  const remuveToken = () => {
    localStorage.removeItem("token");
    setToken("");
  };

  return { token, saveToken, remuveToken };
};

export const useUserData = () => {
  const [userData, setUserData] = useState({
    id: null,
    name: "",
    email: "",
    isEmailVerified: false,
    profilePicture: null,
    createdAt: null,
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const getUser = async () => {
        const userData = await getUserData(token);
        setUserData(userData.user);
      };
      getUser();
    }
  }, []);

  return { userData };
};
