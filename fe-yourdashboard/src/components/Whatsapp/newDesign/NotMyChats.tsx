"use client";
import React from "react";
import MessageBlue from "../../assets/messageBlue.svg";

const NotMyChats: React.FC = () => {
  return (
    <div className="min-h-[500px] overflow-y-auto flex flex-col items-center justify-center"
      style={{ fontFamily: "Montserrat"}}>
      <MessageBlue className="w-[24px] h-[24px] mb-3" />
      <h2 className="text-[12px] tracking-normal text-foreground text-center">
        Aun no tienes conversaciones
      </h2>
    </div>
  );
};

export default NotMyChats;
