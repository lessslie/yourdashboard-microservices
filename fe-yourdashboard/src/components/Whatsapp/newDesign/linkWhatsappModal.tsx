"use client ";
import React from "react";
import { Button } from "antd";
import Agregarwhite from "../../assets/agregarwhite.svg";

export default function LinkWhatsappModal() {
  return (
    <div
      style={{
        backgroundColor: "#344BFF",
        border: "none",
        color: "#FFFFFF",
        borderRadius: "5px",
        width: "226px",
        height: "54px",
        fontWeight: "500",
      }}
        className="flex items-center justify-center gap-2 cursor-pointer"
    >
      <Agregarwhite className="w-[20px] h-[20px]" />
      <Button style={{
        backgroundColor: "#344BFF",
        border: "none",
        color: "#FFFFFF",
        fontSize: "14px",
      }}
      >Vincular WhatsApp</Button>
    </div>
  );
}
