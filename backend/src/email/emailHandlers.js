import { resendClient, sender } from "../lib/resend.js";
import { createWelcomeEmailTemplate, createWelcomeEmailText } from "./emailTemplates.js";

export const sendWelcomeEmail = async (email, name, clientURL) => {
  const { data, error } = await resendClient.emails.send({
    from: `${sender.name} <${sender.email}>`,
    to: email,
    subject: "Welcome to the Chat App!",
    html: createWelcomeEmailTemplate(name, clientURL),
    text: createWelcomeEmailText(name, clientURL), // Plain text version
    headers: {
      "X-Entity-Ref-ID": `${Date.now()}`,
    },
    tags: [
      {
        name: "category",
        value: "welcome",
      },
    ],
  });

  if (error) {
    console.error("Error sending welcome email:", error);
    throw new Error("Failed to send welcome email");
  }

  console.log("Welcome Email sent successfully", data);
};
