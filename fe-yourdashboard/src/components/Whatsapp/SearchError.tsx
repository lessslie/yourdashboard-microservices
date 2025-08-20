// components/Whatsapp/SearchError.tsx
import { Empty } from "antd";

interface SearchErrorProps {
  message?: string;
}

const SearchError: React.FC<SearchErrorProps> = ({ message }) => {
  return (
    <div style={{ padding: "40px 0", textAlign: "center" }}>
      <Empty
        description={message || "No hay resultados encontrados"}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    </div>
  );
};

export default SearchError;
