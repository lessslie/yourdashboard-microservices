"use client ";

import React, { useState } from "react";
import { List, Avatar } from "antd";
import DropDownBlue from "../../assets/dropdownBlue.svg";
import DropUpBlue from "../../assets/dropupBlue.svg";

interface ChatItem {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
}

interface Props {
  chats: ChatItem[];
  onSelectChat: (id: string) => void;
  selectedChat: string | null;
}

const MyChatsMessage: React.FC<Props> = ({
  chats,
  onSelectChat,
  selectedChat,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="overflow-y-auto pl-5">
      <List
        style={{
          fontFamily: "Montserrat",
          marginTop: "16px",
          paddingRight: "5px",
        }}
        dataSource={chats}
        renderItem={(item) => {
          const isSelected = selectedChat === item.id;

          return (
            <div key={item.id}>
              <List.Item
                className={`cursor-pointer hover:bg-[#EBF4FF] 
                    hover:rounded-[10px] !pr-2.5 !pl-2.5 
                    mt-2.5 mb-2.5 !border-none ${
                      isSelected ? "bg-[#EBF4FF] rounded-[10px]" : ""
                    }`}
                onClick={() => onSelectChat(item.id)}
              >
                <List.Item.Meta
                  avatar={
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
                      {item.name[0]}
                    </Avatar>
                  }
                  title={
                    <div className="flex justify-between">
                      <span className="font-semibold text-[#1D2EB6] text-xs">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-[#797979]">
                        {item.time}
                      </span>
                    </div>
                  }
                  description={
                    <div className="flex justify-between items-center pr-1.5">
                      <span className="text-[10px] text-[#000000] text-sm">
                        {item.lastMessage}
                      </span>
                      <span
                        className="cursor-pointer"
                        onClick={() => setIsOpen(!isOpen)}
                      >
                        {isOpen ? (
                          <DropUpBlue className="w-2.5 h-2.5" />
                        ) : (
                          <DropDownBlue className="w-2.5 h-2.5" />
                        )}
                      </span>
                    </div>
                  }
                />
              </List.Item>
              <div className="h-[0.5px] bg-[#C5C5C5] w-full"></div>
            </div>
          );
        }}
      />
    </div>
  );
};

export default MyChatsMessage;
