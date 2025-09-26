"use client";
import React from "react";
import { Button } from "antd";

const LinkWhatsapp: React.FC = () => {
  return (
    <div
      className="flex-1 h-screen flex flex-col items-center justify-center border-l border-[#1D2EB6]"
      style={{ fontFamily: "Montserrat" }}
    >
      <img
        src="/OBJECTS.png"
        alt="Link WhatsApp"
        className="w-[269px] h-[207px] mb-6 mx-auto"
      />

      <h2 className="text-[16px] font-bold tracking-normal text-[#000000] text-center">
        ¡Vincula tu numero!
      </h2>
      <p className="text-[14px] ext-[#000000] text-center mt-2 mb-6 px-4">
        Vincula tu número y accede fácilmente a tus conversaciones.
      </p>
      <Button
        style={{
          backgroundColor: "#344BFF",
          border: "none",
          padding: "10px",
          color: "#FFFFFF",
          borderRadius: "5px",
          width: "187px",
          height: "53px",
          fontWeight: "700",
          fontSize: "16px",
        }}
      >
        Vincular WhatsApp
      </Button>
    </div>
  );
};

export default LinkWhatsapp;
