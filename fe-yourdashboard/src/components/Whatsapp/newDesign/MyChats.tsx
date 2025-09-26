import React from "react";
import AggMessage from "../../assets/aggMessageBlue.svg";
import Buscador from "../../assets/buscador.svg";
import MyChatsMessage from "./MyChatsMessage";
import NotMyChats from "./NotMyChats";

interface ChatItem {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
}

interface MisChatsListProps {
  chats: ChatItem[];
  onSelectChat: (id: string) => void;
  selectedChat: string | null;
}

const MisChatsList: React.FC<MisChatsListProps> = ({
  chats,
  onSelectChat,
  selectedChat,
}) => {
  return (
    <div>
      <div
        className="w-[320px] max-w-full bg-white flex flex-col pl-5 pr-3.5 pt-[22px] border-[#1D2EB6]"
        style={{ fontFamily: "Montserrat" }}
      >
        {/* Encabezado */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex gap-3 items-center justify-center ">
              <div className="flex flex-col">
                <h2 className="font-bold text-[32px] leading-[35.2px] tracking-normal text-[#1D2EB6]">
                  Mis chats
                </h2>
              </div>
              <div className="w-[17px] h-[17px] rounded-full p-1 mt-1.5 bg-[#DBEAFF] flex items-center justify-center">
                <img src="/dropdown.png" alt="" className="cursor-pointer" />
              </div>
            </div>
            <div className="mt-1.5 flex items-center justify-center">
              <AggMessage className="w-[24px] h-[24px] cursor-pointer" />
            </div>
          </div>
          <div>
            <h2 className=" text-[12px] text-[#676767] ">Todos los chats</h2>
          </div>
        </div>

        {/* Buscador */}
        <div className="flex relative mt-3">
          <input
            type="text"
            placeholder="Buscar"
            className="w-full h-[38px] px-3 py-2.5 border border-[#CBD5E1] rounded-[8px] text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Buscador className="w-[22px] h-[22px] text-[#1D2EB6] absolute right-3 top-1/2 transform -translate-y-1/2" />
        </div>
      </div>

      {/* Lista de chats */}
      <div className="overflow-y-auto custom-scrollbar">
        <NotMyChats />
        {/* <MyChatsMessage
          chats={chats}
          onSelectChat={onSelectChat}
          selectedChat={selectedChat}
        /> */}
      </div>
    </div>
  );
};

export default MisChatsList;
