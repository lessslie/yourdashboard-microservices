import React, { useEffect, useState } from "react";
import { Layout, Button, List, Skeleton, Pagination, Card, Input } from "antd";

import { getEmails, handleConnectService } from "./lib/emails";
import { ICuentaGmail } from "../Auth/hooks/useAuth";
import { useEmails } from "./hooks/useEmails";
import GmailAccountSelector from "./GmailAccountSelector";

const { Content } = Layout;

const ListEmails = ({
  token,
  cuentasGmail,
}: {
  token: string;
  cuentasGmail: ICuentaGmail[];
}) => {
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
    <div>
      {cuentasGmail && (
        <Card style={{ marginBottom: "24px" }}>
          <GmailAccountSelector
            cuentasGmail={cuentasGmail || []}
            selectedAccountId={selectedCuentaGmailId}
            onAccountChange={handleAccountChange}
            loading={initLoading}
          />
          <Button type="primary" onClick={conectEmail}>
            Conectar mas de una cuenta
          </Button>
        </Card>
      )}
      <Card
        title={
          <div
            style={{
              marginBottom: "16px",
            }}
          >
            <h4>📧 Emails</h4>
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
          <>
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
                    <Button type="primary">Ver mas</Button>
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
          </>
        )}
      </Card>
    </div>
  );
};

export default ListEmails;
