import nodemailer from "nodemailer";

const gmailUser = import.meta.env.GMAIL_USER;
const gmailAppPassword = import.meta.env.GMAIL_APP_PASSWORD;

export const isEmailEnabled = !!(gmailUser && gmailAppPassword);

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

export function getTransporter() {
    if (!isEmailEnabled) return null;
    if (cachedTransporter) return cachedTransporter;

    cachedTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: gmailUser!,
            pass: gmailAppPassword!,
        },
    });
    return cachedTransporter;
}
