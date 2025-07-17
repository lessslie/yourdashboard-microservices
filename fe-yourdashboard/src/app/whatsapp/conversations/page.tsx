"use client";
import { useState, useEffect } from "react";
import api from "../../../components/Whatsapp/utils/api";
import { ConversationPreview } from "../../../components/Whatsapp/types";
import Link from "next/link";

export default function Home() {
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);

  useEffect(() => {
    api
      .get("/conversations")
      .then((res) => setConversations(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <section className="font-sans grid items-center justify-center gap-8 sm:p-20">
      <h1 className="text-center">📱 Conversaciones</h1>
      {conversations.map((conversation) => (
        <article key={conversation.id} className="">
          <Link href={`/whatsapp/messages/${conversation.id}`}>
            <p className="text-sm">
              <strong>{conversation.name}</strong>
            </p>
            <p>{conversation.last_message}</p>
          </Link>
          
          <article className="text-xs text-gray-500">
            {new Date(conversation.last_message_date).toLocaleString()}
          </article>
        </article>
      ))}
    </section>
  );
}
