import ViewEmails from "@/components/Emails/ViewEmails";
import React from "react";

const EmailDetails = ({ params }: { params: { id: string } }) => {
  return <ViewEmails emailId={params.id} />;
};

export default EmailDetails;
