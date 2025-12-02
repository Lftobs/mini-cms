interface InviteEmailProps {
    recipientEmail: string;
    recipientName?: string;
    inviterName?: string;
    projectName: string;
    inviteLink: string;
    expiresInDays: number;
}

export const generateInviteEmailHTML = ({
    recipientEmail,
    recipientName,
    inviterName,
    projectName,
    inviteLink,
    expiresInDays,
}: InviteEmailProps): string => {
    const greeting = recipientName ? `Hi ${recipientName}` : "Hi there";
    const inviterText = inviterName
        ? `${inviterName} has invited you`
        : "You've been invited";

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #322d2b 0%, #49423d 100%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                You're Invited! 🎉
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 24px;">
                                ${greeting},
                            </p>
                            
                            <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 24px;">
                                ${inviterText} to collaborate on the project <strong>${projectName}</strong>.
                            </p>
                            
                            <p style="margin: 0 0 30px 0; color: #666666; font-size: 14px; line-height: 22px;">
                                Click the button below to accept the invitation and start contributing. This invitation will expire in ${expiresInDays} days.
                            </p>
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="${inviteLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #322d2b 0%, #49423d 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                                            Accept Invitation
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Alternative Link -->
                            <p style="margin: 20px 0 0 0; color: #999999; font-size: 12px; line-height: 18px; text-align: center;">
                                Or copy and paste this link into your browser:<br/>
                                <a href="${inviteLink}" style="color: #667eea; text-decoration: none; word-break: break-all;">
                                    ${inviteLink}
                                </a>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 40px; background-color: #f9f9f9; border-radius: 0 0 8px 8px; border-top: 1px solid #eeeeee;">
                            <p style="margin: 0; color: #999999; font-size: 12px; line-height: 18px; text-align: center;">
                                If you didn't expect this invitation, you can safely ignore this email.
                            </p>
                            <p style="margin: 10px 0 0 0; color: #999999; font-size: 12px; line-height: 18px; text-align: center;">
                                This email was sent to ${recipientEmail}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;
};

export const generateInviteEmailText = ({
    recipientEmail,
    recipientName,
    inviterName,
    projectName,
    inviteLink,
    expiresInDays,
}: InviteEmailProps): string => {
    const greeting = recipientName ? `Hi ${recipientName}` : "Hi there";
    const inviterText = inviterName
        ? `${inviterName} has invited you`
        : "You've been invited";

    return `
${greeting},

${inviterText} to collaborate on the project "${projectName}".

Accept the invitation by visiting this link:
${inviteLink}

This invitation will expire in ${expiresInDays} days.

If you didn't expect this invitation, you can safely ignore this email.

---
This email was sent to ${recipientEmail}
`;
};
