"use client";

import React, { useState, useEffect } from "react";
import { Button, Typography, Space } from "antd";
import {
  HomeOutlined,
  SearchOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

const { Title, Text } = Typography;

const NotFound = () => {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [isAnimating, setIsAnimating] = useState(false);
  const [glitchText, setGlitchText] = useState("404");

  // Efecto de glitch
  useEffect(() => {
    const glitchChars = ["4", "0", "4", "!", "@", "#", "$", "%", "&", "*"];
    const originalText = "404";

    const glitchInterval = setInterval(() => {
      let newText = "";
      for (let i = 0; i < 3; i++) {
        if (Math.random() < 0.3) {
          newText +=
            glitchChars[Math.floor(Math.random() * glitchChars.length)];
        } else {
          newText += originalText[i];
        }
      }
      setGlitchText(newText);

      setTimeout(() => setGlitchText(originalText), 150);
    }, 2000);

    return () => clearInterval(glitchInterval);
  }, []);

  const handleGoHome = () => {
    setIsAnimating(true);
    setTimeout(() => {
      if (accessToken) {
        router.push("/dashboard");
      } else {
        router.push("/");
      }
    }, 300);
  };

  const handleGoBack = () => {
    setIsAnimating(true);
    setTimeout(() => {
      router.back();
    }, 300);
  };

  const handleSearch = () => {
    setIsAnimating(true);
    setTimeout(() => {
      if (accessToken) {
        router.push("/dashboard");
      } else {
        router.push("/auth");
      }
    }, 300);
  };

  return (
    <>
      <div className={`not-found-container ${isAnimating ? "fade-out" : ""}`}>
        {/* Partículas */}
        <div className="particles">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
              }}
            />
          ))}
        </div>

        <div className="content">
          <div className="error-illustration">
            {/* Robot */}
            <div className="robot">
              <div className="robot-head">
                <div className="robot-eyes">
                  <div className="eye left-eye"></div>
                  <div className="eye right-eye"></div>
                </div>
                <div className="robot-mouth"></div>
              </div>
              <div className="robot-body">
                <div className="robot-arm left-arm"></div>
                <div className="robot-arm right-arm"></div>
              </div>
            </div>

            {/* Texto */}
            <div className="error-text">
              <span className="glitch-text">{glitchText}</span>
            </div>
          </div>

          <div className="message-section">
            <Title
              level={1}
              style={{
                color: "#1F4788",
                fontFamily: "Montserrat, sans-serif",
                fontWeight: "700",
                margin: "0 0 16px 0",
                fontSize: "2.5rem",
              }}
            >
              ¡Oops! Página no encontrada
            </Title>

            <Text
              style={{
                fontSize: "18px",
                color: "#666666",
                fontFamily: "Montserrat, sans-serif",
                lineHeight: "1.6",
                textAlign: "center",
                display: "block",
                marginBottom: "32px",
              }}
            >
              Parece que te has perdido en el espacio digital.
              <br />
              La página que buscas no existe o ha sido movida.
            </Text>

            <Space size="large" direction="vertical" style={{ width: "100%" }}>
              <Space size="middle" wrap style={{ justifyContent: "center" }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<HomeOutlined />}
                  onClick={handleGoHome}
                  style={{
                    backgroundColor: "#344BFF",
                    borderColor: "#344BFF",
                    fontFamily: "Montserrat, sans-serif",
                    fontWeight: "500",
                    height: "48px",
                    padding: "0 24px",
                    borderRadius: "8px",
                  }}
                  className="action-button"
                >
                  Ir al Inicio
                </Button>

                <Button
                  size="large"
                  icon={<ArrowLeftOutlined />}
                  onClick={handleGoBack}
                  style={{
                    fontFamily: "Montserrat, sans-serif",
                    fontWeight: "500",
                    height: "48px",
                    padding: "0 24px",
                    borderRadius: "8px",
                    borderColor: "#344BFF",
                    color: "#344BFF",
                  }}
                  className="action-button"
                >
                  Volver Atrás
                </Button>

                <Button
                  size="large"
                  icon={<SearchOutlined />}
                  onClick={handleSearch}
                  style={{
                    fontFamily: "Montserrat, sans-serif",
                    fontWeight: "500",
                    height: "48px",
                    padding: "0 24px",
                    borderRadius: "8px",
                    borderColor: "#52c41a",
                    color: "#52c41a",
                  }}
                  className="action-button"
                >
                  {accessToken ? "Buscar" : "Iniciar Sesión"}
                </Button>
              </Space>
            </Space>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap");

        .not-found-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 20px;
          transition: opacity 0.3s ease-out;
        }

        .not-found-container.fade-out {
          opacity: 0;
        }

        .particles {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 50%;
          animation: float linear infinite;
        }

        @keyframes float {
          0% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) rotate(360deg);
            opacity: 0;
          }
        }

        .content {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: 48px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          text-align: center;
          max-width: 600px;
          width: 100%;
          animation: slideUp 0.8s ease-out;
        }

        @keyframes slideUp {
          from {
            transform: translateY(50px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .error-illustration {
          margin-bottom: 32px;
          position: relative;
        }

        .robot {
          display: inline-block;
          margin-bottom: 20px;
          animation: robotBounce 2s ease-in-out infinite;
        }

        @keyframes robotBounce {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .robot-head {
          width: 80px;
          height: 60px;
          background: #344bff;
          border-radius: 20px 20px 10px 10px;
          margin: 0 auto 5px;
          position: relative;
        }

        .robot-eyes {
          display: flex;
          justify-content: space-between;
          padding: 15px 15px 0;
        }

        .eye {
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
          animation: blink 3s infinite;
        }

        @keyframes blink {
          0%,
          90%,
          100% {
            transform: scaleY(1);
          }
          95% {
            transform: scaleY(0.1);
          }
        }

        .robot-mouth {
          width: 20px;
          height: 8px;
          background: white;
          border-radius: 0 0 10px 10px;
          margin: 5px auto;
        }

        .robot-body {
          width: 60px;
          height: 40px;
          background: #1890ff;
          border-radius: 10px;
          margin: 0 auto;
          position: relative;
        }

        .robot-arm {
          width: 8px;
          height: 25px;
          background: #1890ff;
          border-radius: 4px;
          position: absolute;
          top: 5px;
        }

        .left-arm {
          left: -10px;
          animation: waveLeft 2s ease-in-out infinite;
        }

        .right-arm {
          right: -10px;
          animation: waveRight 2s ease-in-out infinite;
        }

        @keyframes waveLeft {
          0%,
          100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(-20deg);
          }
        }

        @keyframes waveRight {
          0%,
          100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(20deg);
          }
        }

        .error-text {
          margin-top: 20px;
        }

        .glitch-text {
          font-size: 4rem;
          font-weight: 900;
          color: #344bff;
          font-family: "Montserrat", sans-serif;
          text-shadow: 2px 2px 0px rgba(255, 255, 255, 0.8);
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        .message-section {
          animation: fadeInUp 1s ease-out 0.3s both;
        }

        @keyframes fadeInUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .action-button {
          transition: all 0.3s ease !important;
        }

        .action-button:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15) !important;
        }

        .action-button:active {
          transform: translateY(0) !important;
        }

        @media (max-width: 768px) {
          .content {
            padding: 32px 24px;
            margin: 20px;
          }

          .glitch-text {
            font-size: 3rem;
          }

          .robot {
            transform: scale(0.8);
          }

          h1 {
            font-size: 2rem !important;
          }
        }

        @media (max-width: 480px) {
          .content {
            padding: 24px 16px;
          }

          .glitch-text {
            font-size: 2.5rem;
          }

          .action-button {
            width: 100% !important;
            margin-bottom: 8px !important;
          }
        }
      `}</style>
    </>
  );
};

export default NotFound;
