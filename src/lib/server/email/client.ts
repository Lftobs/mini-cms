import nodemailer from "nodemailer";

// Lazy initialization helper
function getTransporter() {
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailAppPassword) {
        return null;
    }

    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: gmailUser,
            pass: gmailAppPassword,
        },
    });
}

let cachedTransporter: nodemailer.Transporter | null | undefined;

// Exported getter that handles caching and connection verification
export function getEmailTransporter() {
    if (cachedTransporter === undefined) {
        const transporter = getTransporter();
        cachedTransporter = transporter;

        if (transporter) {
            transporter
                .verify()
                .then(() => {
                    console.log("[Email] Gmail SMTP connection verified successfully");
                })
                .catch((error) => {
                    console.error("[Email] Gmail SMTP connection failed:", error);
                });
        } else {
            console.warn(
                "[Email] Gmail credentials not found. Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables. Email sending will be disabled.",
            );
        }
    }
    return cachedTransporter;
}

export function isEmailEnabled() {
    return getEmailTransporter() !== null;
}

