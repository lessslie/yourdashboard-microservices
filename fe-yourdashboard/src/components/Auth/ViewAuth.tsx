"use client";
import React, { useState } from "react";
import Image from "next/image";
import FormLogin from "./FormLogin";
import FormRegister from "./FormRegister";
import { SpinerGlobal, useCargando } from "@/utils/cargando";
import Title from "antd/es/typography/Title";

const ViewAuth = () => {
  const [changeForm, setChangeForm] = useState(false);
  const { loading } = useCargando();
  if (loading) return <SpinerGlobal />;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen absolute top-0 w-full">
      {/* Imagen lateral */}
      <div
        className={`hidden lg:flex w-1/2 relative items-center justify-center ${
          changeForm ? "order-1" : "order-2"
        }`}
        style={{ backgroundColor: "rgba(235, 244, 255, 1)" }}
      >
        <Image
          src={
            changeForm ? "/background-registro.png" : "/background-login.png"
          }
          alt="Imagen Auth"
          fill
          className="object-contain p-8"
          priority
        />
      </div>

      {/* Contenedor formulario */}
      <div
        className={`flex w-full lg:w-1/2 items-center justify-center px-6 py-10 bg-white ${
          changeForm ? "order-2" : "order-1"
        }`}
      >
        <div className="w-full max-w-md text-center space-y-16">
          {/* Logo (solo en login) */}
          {!changeForm && (
            <Image
              src="/Nombre=Horizontal.png"
              alt="Logo"
              width={220}
              height={40}
              className="mx-auto"
            />
          )}

          {/* Títulos */}
          <Title level={2} className="!text-blue-900 !font-bold !text-center">
            {changeForm ? "¡Regístrate Aquí!" : "¡Iniciar Sesión!"}
          </Title>

          <Title level={4} className="!font-normal !text-gray-600 mt-2">
            {changeForm
              ? "¿Ya tienes una cuenta?"
              : "¿Aún no tienes una cuenta?"}{" "}
            <span
              onClick={() => setChangeForm(!changeForm)}
              className="cursor-pointer text-blue-600 font-semibold hover:underline"
            >
              {changeForm ? "Iniciar Sesión" : "Registrarse"}
            </span>
          </Title>

          {/* Formulario */}
          <div className="mt-10">
            {changeForm ? (
              <FormRegister setChangeForm={setChangeForm} />
            ) : (
              <FormLogin />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewAuth;
