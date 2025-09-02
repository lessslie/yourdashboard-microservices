import { useEffect, useState } from "react";
import { Spin } from "antd";

export const useCargando = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleBeforeUnload = (event: { type: string }) => {
      // Detectar si la página está siendo recargada
      if (event.type === "beforeunload") {
        setLoading(true);
      }
    };

    // Detectar si es una recarga de página (F5, etc.)
    const isReload =
      performance.getEntriesByType("navigation")[0].entryType === "reload";

    if (isReload) {
      setLoading(true);
      const timer = setTimeout(() => {
        setLoading(false);
      }, 2000); // Simulación de tiempo de carga

      return () => clearTimeout(timer);
    } else {
      setLoading(false);
    }

    // Registrar el evento para manejar recargas específicas
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return { loading, setLoading };
};

export const SpinerGlobal = () => {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Spin size="large" />
    </div>
  );
};
