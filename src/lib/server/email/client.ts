import nodemailer from "nodemailer";

const gmailUser = import.meta.env.GMAIL_USER;
const gmailAppPassword = import.meta.env.GMAIL_APP_PASSWORD;

if (!gmailUser || !gmailAppPassword) {
    console.warn(
        "[Email] Gmail credentials not found. Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables. Email sending will be disabled.",
    );
}

// Create Gmail transporter
export const transporter =
    gmailUser && gmailAppPassword
        ? nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: gmailUser,
                pass: gmailAppPassword,
            },
        })
        : null;

export const isEmailEnabled = !!transporter;

// Verify connection on startup (optional but recommended)
if (transporter) {
    transporter
        .verify()
        .then(() => {
            console.log("[Email] Gmail SMTP connection verified successfully");
        })
        .catch((error) => {
            console.error("[Email] Gmail SMTP connection failed:", error);
        });
}
