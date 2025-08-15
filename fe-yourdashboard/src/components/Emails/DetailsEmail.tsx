import React, { useEffect, useState } from "react";
import { Button, Card } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";

import { getEmailDetails } from "@/services/emails/emails";
import { useRouter } from "next/navigation";

const DetailsEmail = ({
  emailId,
  token,
}: {
  emailId: string;
  token: string;
}) => {
  const router = useRouter();
  const [emailDetails, setEmailDetails] = useState({
    subject: "",
    fromEmail: "",
    fromName: "",
    receivedDate: "",
    bodyHtml: "",
  });
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await getEmailDetails(token, emailId);
        setEmailDetails({
          subject: response.data.subject,
          fromEmail: response.data.fromEmail,
          fromName: response.data.fromName,
          receivedDate: response.data.receivedDate,
          bodyHtml: response.data.bodyHtml,
        });
      } catch (error) {
        console.error(error);
      }
    };

    fetchDetails();
  }, []);
  console.log("emailDetails", emailDetails);

  return (
    <div style={{ padding: "24px" }}>
      <Card
        title={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px",
            }}
          >
            <Button type="primary" onClick={() => router.back()}>
              <ArrowLeftOutlined />
            </Button>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <h4 style={{ margin: 5 }}>Asunto:</h4>
                <p style={{ margin: 0 }}>{emailDetails.subject}</p>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <h4 style={{ margin: 5 }}>De:</h4>
                <p style={{ margin: 0 }}>{emailDetails.fromName}</p>
              </div>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <h4 style={{ margin: 5 }}>Email remitente:</h4>
                <p style={{ margin: 0 }}>{emailDetails.fromEmail}</p>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <h4 style={{ margin: 5 }}>Fecha de envío:</h4>
                <p style={{ margin: 0 }}>{emailDetails.receivedDate}</p>
              </div>
            </div>
          </div>
        }
      >
        <div dangerouslySetInnerHTML={{ __html: emailDetails.bodyHtml }} />
      </Card>
    </div>
  );
};

export default DetailsEmail;
