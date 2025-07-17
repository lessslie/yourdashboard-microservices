"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import api from "../../../../components/Whatsapp/utils/api";
import { Message } from "../../../../components/Whatsapp/types";

export default function Conversation() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!id) return;
    api
      .get("/messages", { params: { conversationId: id } })
      .then((res) => setMessages(res.data))
      .catch((err) => console.error(err));
  }, [id]);

  return (
    <div style={{ padding: "2rem" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">📨 Mensajes</h2>
        <button
          onClick={() => router.push("/whatsapp/conversations")}
          className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Volver al inicio
        </button>
      </div>

      {messages.length > 0 && (
        <div className="mb-2">
          <strong>{messages[0].name}</strong>:
        </div>
      )}

      {messages.map((msg) => (
        <div key={msg.id} className="mb-4 border-b border-gray-300 pb-2">
          <div>{msg.message}</div>
          <div className="text-sm text-gray-500">
            {new Date(msg.timestamp).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
