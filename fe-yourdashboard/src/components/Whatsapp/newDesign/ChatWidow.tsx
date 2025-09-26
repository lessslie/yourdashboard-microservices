import React from "react";
import { Avatar, Input } from "antd";
import Buscador from "../../assets/buscador.svg";
import Options from "../../assets/optionsBlue.svg";
import AudioBlue from "../../assets/audioBlue.svg";
import AgregarBlue from "../../assets/agregarBlue.svg";

interface Message {
  id: string;
  sender: "me" | "other";
  text: string;
}

interface Props {
  selectedChatName: string;
  messages: Message[];
  onSendMessage: (msg: string) => void;
}

const ChatWindow: React.FC<Props> = ({
  selectedChatName,
  messages,
  onSendMessage,
}) => {
  const [text, setText] = React.useState("");

  const handleSend = () => {
    if (text.trim()) {
      onSendMessage(text);
      setText("");
    }
  };

  return (
    <div
      className="flex flex-col flex-1 bg-[#fffffff] ml-1"
      style={{ fontFamily: "Montserrat" }}
    >
      {/* Header de la conversación */}
      <div
        className="flex items-center justify-between px-4 py-2
       border-b border-l border-[#1D2EB6]
        h-[68px] p-[22px] bg-white"
      >
        <div className="flex items-center space-x-2  gap-3">
          <Avatar
            style={{
              backgroundColor: "#1D2EB6",
              color: "#FFFFFF",
              width: 35,
              height: 35,
              fontSize: 14,
              fontFamily: "Montserrat",
              padding: 10,
            }}
          >
            {selectedChatName[0]}
          </Avatar>
          <h3 className="font-semibold text-[#1D2EB6] text-[18px]">
            {selectedChatName}
          </h3>
        </div>
        <div className="flex relative mt-3 gap-3">
          <Buscador className="w-[24px] h-[24px] text-[#1D2EB6]" />
          <Options className="w-[24px] h-[24px] cursor-pointer" />
        </div>
      </div>

      {/* Mensajes */}
      <div className="p-4 border-l border-[#1D2EB6] max-h-[450px] overflow-y-auto custom-scrollbar mr-2 py-2 ">
        <div
          className="flex-1 p-4 space-y-3 
        bg-[url('/BACKGROUND_1.png')] bg-center 
        bg-repeat "
          style={{ fontFamily: "Montserrat" }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start ${
                msg.sender === "me" ? "justify-end" : "justify-start"
              }`}
            >
              {/* Avatar solo para el remitente */}
              {msg.sender !== "me" && (
                <Avatar
                  style={{
                    backgroundColor: "#1D2EB6",
                    color: "#FFFFFF",
                    width: 35,
                    height: 35,
                    fontSize: 14,
                    fontFamily: "Montserrat",
                    padding: 10,
                    marginRight: 8, // separación entre avatar y mensaje
                  }}
                >
                  {selectedChatName[0]}
                </Avatar>
              )}

              {/* Mensaje */}
              <div
                className={`w-[277px] min-h-[48px] px-2.5 py-2.5 gap-2.5
          rounded-br-[10px] rounded-bl-[10px] rounded-tr-[10px]
          focus:outline-none focus:ring-2 focus:ring-blue-500
          opacity-100 ${
            msg.sender === "me"
              ? "bg-[#DBEAFF] text-[#000000]"
              : "bg-[#BED8FF] text-[#000000]"
          }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Caja para escribir */}
      <div
        className="relative pr-12 pl-10 pt-6
       bg-white flex items-center space-x-2
        border-l border-[#1D2EB6]"
        style={{ fontFamily: "Montserrat" }}
      >
        <div
          className="flex gap-3 items-center justify-center 
        w-[666px] h-[42px] rounded-[8px] px-2.5 py-3 
        flex-1 border border-[#6E95FF]"
        >
          <AgregarBlue className="w-[24px] h-[24px]" />
          <Input
            style={{
              border: "none",
              boxShadow: "none",
              outline: "none",
            }}
            placeholder="Escribe un mensaje..."
            className="w-[500px] h-[20px]
             text-sm text-[#000000] 
             placeholder:text-[#647487] placeholder:text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPressEnter={handleSend}
          />
          <AudioBlue className="w-[24px] h-[24px]" />
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
