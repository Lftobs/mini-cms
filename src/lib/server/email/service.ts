import { getEmailTransporter, isEmailEnabled } from "./client";
import {
    generateInviteEmailHTML,
    generateInviteEmailText,
} from "./templates";

interface SendInviteEmailParams {
    to: string;
    recipientName?: string;
    inviterName?: string;
    projectName: string;
    inviteLink: string;
    expiresInDays?: number;
}

export const sendInviteEmail = async ({
    to,
    recipientName,
    inviterName,
    projectName,
    inviteLink,
    expiresInDays = 7,
}: SendInviteEmailParams): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
}> => {
    // Check if email is enabled using the function call
    if (!isEmailEnabled()) {
        console.warn(
            "[Email] Email service is not configured. Skipping email send.",
        );
        return {
            success: false,
            error: "Email service not configured",
        };
    }

    const transporter = getEmailTransporter();
    if (!transporter) {
        return {
            success: false,
            error: "Email transporter initialization failed",
        };
    }

    try {
        const gmailUser = process.env.GMAIL_USER;
        const fromName = process.env.EMAIL_FROM_NAME || "Mini CMS";

        const htmlContent = generateInviteEmailHTML({
            recipientEmail: to,
            recipientName,
            inviterName,
            projectName,
            inviteLink,
            expiresInDays,
        });

        const textContent = generateInviteEmailText({
            recipientEmail: to,
            recipientName,
            inviterName,
            projectName,
            inviteLink,
            expiresInDays,
        });

        const info = await transporter.sendMail({
            from: `"${fromName}" <${gmailUser}>`,
            to: to,
            subject: `You're invited to collaborate on ${projectName}`,
            text: textContent,
            html: htmlContent,
        });

        // console.log(`[Email] Successfully sent invite to ${to}. ID: ${info.messageId}`);
        return {
            success: true,
            messageId: info.messageId,
        };
    } catch (error) {
        console.error("[Email] Error sending invite email:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
};
