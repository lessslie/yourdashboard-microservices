// "use client";
// import React, { useState } from "react";
// import { Card, Input, Row, Col, Typography, message, Button } from "antd";
// import {
//   MailOutlined,
//   CalendarOutlined,
//   MessageOutlined,
//   ArrowRightOutlined,
//   SearchOutlined,
// } from "@ant-design/icons";
// import { useRouter } from "next/navigation";
// import { globalSearch } from "@/services/search/searchService";
// import { IGlobalSearchResponse } from "@/interfaces/interfacesSearch";
// import GlobalSearchResultsModal from "@/components/Search/GlobalSearchResultsModal";

// const { Title, Paragraph } = Typography;
// const { Search } = Input;

// const DashboardPage = () => {
//   const router = useRouter();
//   const [searchTerm, setSearchTerm] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [modalVisible, setModalVisible] = useState(false);
//   const [searchResults, setSearchResults] =
//     useState<IGlobalSearchResponse | null>(null);

//   const handleNavigation = (path: string) => {
//     router.push(path);
//   };

//   const onSearch = async (value: string) => {
//     const term = value.trim();
//     if (!term) {
//       message.warning("Por favor, ingresa un término de búsqueda.");
//       return;
//     }
//     setSearchTerm(term);
//     setLoading(true);
//     setModalVisible(true);
//     try {
//       const results = await globalSearch(term.toLowerCase());
//       setSearchResults(results);
//     } catch (error) {
//       console.error(error);
//       message.error(
//         error instanceof Error
//           ? error.message
//           : "Ocurrió un error en la búsqueda."
//       );
//       setModalVisible(false);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const modules = [
//     {
//       title: "Emails",
//       description: "Gestiona tus correos electrónicos y cuentas conectadas.",
//       icon: <MailOutlined style={{ fontSize: "24px", color: "#1890ff" }} />,
//       path: "/dashboard/email",
//     },
//     {
//       title: "Calendario",
//       description: "Organiza tus eventos, reuniones y recordatorios.",
//       icon: <CalendarOutlined style={{ fontSize: "24px", color: "#52c41a" }} />,
//       path: "/dashboard/calendar",
//     },
//     {
//       title: "WhatsApp",
//       description: "Conecta y responde tus chats de WhatsApp directamente.",
//       icon: <MessageOutlined style={{ fontSize: "24px", color: "#722ed1" }} />,
//       path: "/dashboard/whatsapp",
//     },
//   ];

//   return (
//     <div style={{ padding: "24px", minHeight: "100vh", background: "#f0f2f5" }}>
//       <Title level={2}>Dashboard Principal</Title>
//       <Paragraph type="secondary">
//         Bienvenido a tu centro de control. Desde aquí puedes acceder a todos los
//         módulos y realizar búsquedas globales.
//       </Paragraph>

//       {/* Buscador Global */}
//       <Card style={{ marginBottom: "24px" }}>
//         <Title level={4}>Búsqueda Global</Title>
//         <Paragraph>
//           Busca en tus Emails, Calendario y WhatsApp desde un solo lugar.
//         </Paragraph>
//         <Search
//           placeholder="Buscar 'Reunión mañana' o 'Factura de...' "
//           enterButton={
//             <Button type="primary" icon={<SearchOutlined />}>
//               Buscar
//             </Button>
//           }
//           size="large"
//           onSearch={onSearch}
//           loading={loading}
//         />
//       </Card>

//       {/* Módulos */}
//       <Row gutter={[16, 16]}>
//         {modules.map((module) => (
//           <Col xs={24} sm={24} md={8} key={module.title}>
//             <Card
//               hoverable
//               onClick={() => handleNavigation(module.path)}
//               style={{
//                 display: "flex",
//                 flexDirection: "column",
//                 height: "100%",
//               }}
//             >
//               <Card.Meta
//                 avatar={module.icon}
//                 title={<Title level={5}>{module.title}</Title>}
//                 description={
//                   <Paragraph style={{ flexGrow: 1 }}>
//                     {module.description}
//                   </Paragraph>
//                 }
//               />
//               <div style={{ marginTop: "16px", textAlign: "right" }}>
//                 <Button type="link" icon={<ArrowRightOutlined />}>
//                   Ir al módulo
//                 </Button>
//               </div>
//             </Card>
//           </Col>
//         ))}
//       </Row>

//       {/* Modal de Resultados */}
//       <GlobalSearchResultsModal
//         visible={modalVisible}
//         loading={loading}
//         searchTerm={searchTerm}
//         results={searchResults}
//         onCancel={() => setModalVisible(false)}
//       />
//     </div>
//   );
// };

// export default DashboardPage;
import DashboardSearchPage from "@/components/Dashboard/DashboardSearchPage";

export default function DashboardPage() {
  return <DashboardSearchPage />;
}
