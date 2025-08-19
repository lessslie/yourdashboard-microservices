import React from "react";
import { Button, Table } from "antd";

import type { TableProps } from "antd";

import { formatoDeFecha } from "@/utils/date";
import { ICuentaGmail } from "@/interfaces/interfacesAuth";

type TabsProps = {
  data: ICuentaGmail[];
  handleConnectService: (cuentaGmailId: string) => void;
};

const TabsTest = ({ data, handleConnectService }: TabsProps) => {
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
      title: "Ultima sincronizacion",
      key: "lastSync",
      dataIndex: "lastSync",
      render: (_, record) =>
        record.lastSync === "Sin sincronizar"
          ? "Sin sincronizar"
          : formatoDeFecha(record.lastSync as Date),
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
