import React, { useState } from "react";
import { Button, List, Skeleton, Pagination, Card, Input } from "antd";

import { handleConnectService } from "../../services/emails/emails";
import { DownOutlined, UpOutlined } from "@ant-design/icons";

import { useEmails } from "./hooks/useEmails";
import TabsTest from "./Tabs";
import { ICuentaGmail } from "@/interfaces/interfacesAuth";
import { useRouter } from "next/navigation";

const ListEmails = ({
  userId,
  token,
  cuentasGmail,
}: {
  userId: number;
  token: string;
  cuentasGmail: ICuentaGmail[];
}) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const {
    initLoading,
    list,
    setPage,
    setLimit,
    page,
    limit,
    handleAccountChange,
    handleSync,
    handleSearchTermChange,
    selectedCuentaGmailId,
    handleCheck,
    searchTerm,
    viewAll,
    handleViewAll,
  } = useEmails(cuentasGmail, userId);
  //console.log("list", list);
  //console.log("cuentasGmail", cuentasGmail);

  const conectEmail = async () => {
    await handleConnectService(token);
  };

  return (
    <div style={{ padding: "24px" }}>
      {cuentasGmail.length !== 0 ? (
        <Card
          title={
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h4>
                📧 Cuentas de Gmail conectadas
                <span> ({cuentasGmail.length})</span>
              </h4>
              {cuentasGmail.length > 1 && (
                <Button type="primary" onClick={handleViewAll}>
                  Ver todos los emails
                </Button>
              )}
              <div style={{ display: "flex", gap: "16px" }}>
                <Button type="primary" onClick={conectEmail}>
                  Conectar mas de una cuenta
                </Button>
                {open ? (
                  <Button onClick={() => setOpen(false)}>
                    Ocultar lista de emails
                    <UpOutlined />
                  </Button>
                ) : (
                  <Button onClick={() => setOpen(true)}>
                    Ver lista de emails
                    <DownOutlined />
                  </Button>
                )}
              </div>
            </div>
          }
          style={{ marginBottom: "24px", textAlign: "center" }}
        >
          {open && (
            <TabsTest
              data={cuentasGmail}
              handleConnectService={handleAccountChange}
              handleSync={handleSync}
            />
          )}
        </Card>
      ) : (
        <Card
          title={
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h4>📧 Cuentas de Gmail conectadas</h4>
              <Button type="primary" onClick={conectEmail}>
                Conectar cuenta Gmail
              </Button>
            </div>
          }
          style={{ textAlign: "center", marginBottom: "24px" }}
        >
          <p>No hay cuentas de Gmail conectadas</p>
        </Card>
      )}
      <Card
        title={
          <div
            style={{
              marginBottom: "16px",
            }}
          >
            <h4>
              {viewAll ? "📧 Todos los emails" : `📧 Emails: `}
              {cuentasGmail.find((c) => selectedCuentaGmailId?.includes(c.id))
                ?.emailGmail || ""}{" "}
              ({list.total})
            </h4>
            <div style={{ display: "flex", gap: "50px" }}>
              <Input.Search
                allowClear
                placeholder="Buscar..."
                onChange={handleSearchTermChange}
                onSearch={handleCheck}
                enterButton
              />
            </div>
          </div>
        }
        style={{ flex: 1 }}
      >
        {list.total === 0 && searchTerm !== "" ? (
          <div style={{ textAlign: "center", padding: "50px" }}>
            <p>No se encontraron emails con el termino: {searchTerm}</p>
          </div>
        ) : list.total === 0 ? (
          <div style={{ textAlign: "center", padding: "50px" }}>
            <p>Conecta una cuenta Gmail para ver tus emails</p>
            <Button type="primary" onClick={conectEmail}>
              Conectar cuenta Gmail
            </Button>
          </div>
        ) : (
          <div
            style={{ gap: "56px", display: "flex", flexDirection: "column" }}
          >
            <List
              className="demo-loadmore-list"
              loading={initLoading}
              itemLayout="horizontal"
              dataSource={list.emails}
              renderItem={(item) => (
                <List.Item>
                  <Skeleton avatar title={false} loading={false} active>
                    <List.Item.Meta
                      // avatar={<Avatar src={item.avatar} />}
                      title={item.name}
                      description={item.subject}
                    />
                    <Button
                      type="primary"
                      onClick={() => router.push(`/dashboard/email/${item.id}`)}
                    >
                      Leer mail
                    </Button>
                  </Skeleton>
                </List.Item>
              )}
            />
            <Pagination
              total={list.total}
              showTotal={(total) => `Total ${total} emails`}
              defaultCurrent={page}
              pageSize={limit}
              onChange={(page, limit) => {
                setPage(page);
                setLimit(limit);
              }}
            />
          </div>
        )}
      </Card>
    </div>
  );
};

export default ListEmails;
