"use client";

import { Input, Button, Space } from "antd";
import { useState } from "react";
import axios from "axios";
import { SendOutlined } from "@ant-design/icons";

export default function ChatInput({ chatId }: { chatId: string }) {
  const [message, setMessage] = useState("");

  const handleSend = async () => {
    if (!message.trim()) return;
    try {
      await axios.post("/api/messages", {
        chatId,
        message: message.trim(),
      });
    } catch (error) {
      console.error("Error enviando mensaje:", error);
    }
    setMessage("");
  };

  return (
    <Space.Compact style={{ width: "100%" }}>
      <Input
        placeholder="Escribe un mensaje..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onPressEnter={handleSend}
      />
      <Button type="primary" icon={<SendOutlined />} onClick={handleSend} />
    </Space.Compact>
  );
}
