export const formatoDeFecha = (dateStr: Date) => {
  const date = new Date(dateStr);

  const optionsDate: Intl.DateTimeFormatOptions = {
    day: "numeric",
    year: "numeric",
    month: "long",
  };
  const formattedDate = date.toLocaleDateString("es-ES", optionsDate);

  return `${formattedDate}`;
};

export const formatoDeFechaCorta = (dateStr: Date): string => {
  const date = new Date(dateStr);

  const optionsDate: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  };

  return date.toLocaleDateString("es-ES", optionsDate);
};

export const formatoDeFechaYHora = (dateStr: Date): string => {
  const date = new Date(dateStr);

  const optionsDateTime: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false, // Usa formato de 24 horas
  };

  return date.toLocaleDateString("es-ES", optionsDateTime);
};
