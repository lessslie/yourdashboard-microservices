import React, { useState } from "react";
import { Layout, Button, List, Skeleton, Pagination, Card, Input } from "antd";

import { handleConnectService } from "./lib/emails";
import { DownOutlined, UpOutlined } from "@ant-design/icons";
import { ICuentaGmail } from "../Auth/hooks/useAuth";
import { useEmails } from "./hooks/useEmails";
import TabsTest from "./Tabs";

const { Content } = Layout;

const ListEmails = ({
  token,
  cuentasGmail,
}: {
  token: string;
  cuentasGmail: ICuentaGmail[];
}) => {
  const [open, setOpen] = useState(true);
  const {
    initLoading,
    list,
    setPage,
    setLimit,
    page,
    limit,
    handleAccountChange,
    selectedCuentaGmailId,
  } = useEmails(cuentasGmail);
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
              <h4>📧 Cuentas de Gmail conectadas</h4>

              {open ? (
                <UpOutlined onClick={() => setOpen(false)} />
              ) : (
                <DownOutlined onClick={() => setOpen(true)} />
              )}
            </div>
          }
          style={{ marginBottom: "24px", textAlign: "center" }}
        >
          {open && (
            <div
              style={{ gap: "16px", display: "flex", flexDirection: "column" }}
            >
              <TabsTest
                data={cuentasGmail}
                handleConnectService={handleAccountChange}
              />
              <Button type="primary" onClick={conectEmail}>
                Conectar mas de una cuenta
              </Button>
            </div>
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
              📧 Emails:{" "}
              {cuentasGmail.find((c) => selectedCuentaGmailId?.includes(c.id))
                ?.emailGmail || ""}{" "}
              ({list.total})
            </h4>
            <div style={{ display: "flex", gap: "50px" }}>
              <Input.Search placeholder="Buscar..." enterButton />
              <Input placeholder="Filtrar por..." />
            </div>
          </div>
        }
        style={{ flex: 1 }}
      >
        {list.total === 0 ? (
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
                    <Button type="primary">Leer mail</Button>
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
