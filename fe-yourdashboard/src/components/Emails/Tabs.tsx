import React from "react";
import { Button, Table } from "antd";

import type { TableProps } from "antd";

import { formatoDeFechaYHora } from "@/utils/date";
import { ICuentaGmail } from "@/interfaces/interfacesAuth";

type TabsProps = {
  data: ICuentaGmail[];
  handleConnectService: (cuentaGmailId: string) => void;
  handleSync: (cuentaGmailId: string) => void;
};

const TabsTest = ({ data, handleConnectService, handleSync }: TabsProps) => {
  const columns: TableProps<ICuentaGmail>["columns"] = [
    {
      title: "Nombre cuenta",
      dataIndex: "nameGmail",
      key: "nameGmail",
    },
    {
      title: "Email",
      dataIndex: "emailGmail",
      key: "emailGmail",
    },
    {
      title: "Alias",
      dataIndex: "alias",
      key: "alias",
    },

    {
      title: "Cantidad de emails",
      key: "emailsCount",
      dataIndex: "emailsCount",
    },
    {
      title: "Sincronizacion",
      key: "lastSync",
      dataIndex: "lastSync",
      render: (_, record) =>
        record.lastSync === "Sin sincronizar" ? (
          <Button
            color="default"
            variant="text"
            onClick={() => handleSync(record.id)}
          >
            {formatoDeFechaYHora(record.createdAt as Date)}
          </Button>
        ) : (
          <Button
            color="default"
            variant="text"
            onClick={() => handleSync(record.id)}
          >
            {formatoDeFechaYHora(record.lastSync as Date)}
          </Button>
        ),
    },
    {
      title: "Activo",
      key: "isActive",
      dataIndex: "isActive",
      render: (_, record) =>
        record.isActive === "Activo" ? (
          <p style={{ color: "green", margin: 0, fontWeight: "bold" }}>
            {record.isActive}
          </p>
        ) : (
          <p style={{ color: "red", margin: 0 }}>{record.isActive}</p>
        ),
    },
    {
      title: "Acción",
      key: "action",
      render: (_, record) => (
        <div style={{ display: "flex", gap: "8px" }}>
          <Button
            type="primary"
            onClick={() => handleConnectService(record.id)}
          >
            Ver emails
          </Button>
        </div>
      ),
    },
  ];
  return (
    <Table<ICuentaGmail>
      pagination={false}
      columns={columns}
      dataSource={data}
    />
  );
};

export default TabsTest;
