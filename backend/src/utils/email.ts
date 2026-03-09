import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const REGION = process.env.REGION || "eu-central-1";
const SENDER_EMAIL = process.env.SES_SENDER_EMAIL || "hello@picsonar.com";

const sesClient = new SESClient({ region: REGION });

export const sendResetPasswordEmail = async (email: string, token: string) => {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    const command = new SendEmailCommand({
        Source: SENDER_EMAIL,
        Destination: {
            ToAddresses: [email],
        },
        Message: {
            Subject: {
                Data: "Reset Your Password - PicSonar",
                Charset: "UTF-8",
            },
            Body: {
                Html: {
                    Data: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #333;">Reset Your Password</h2>
                            <p>Hello,</p>
                            <p>We received a request to reset your password for your PicSonar account. Click the button below to proceed:</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${resetLink}" style="background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
                            </div>
                            <p>If you didn't request this, you can safely ignore this email. The link will expire in 1 hour.</p>
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                            <p style="font-size: 12px; color: #777;">&copy; 2024 PicSonar. All rights reserved.</p>
                        </div>
                    `,
                    Charset: "UTF-8",
                },
            },
        },
    });

    try {
        await sesClient.send(command);
        console.log(`Email sent to ${email}`);
    } catch (error) {
        console.error("Error sending email:", error);
        throw new Error("Failed to send email");
    }
};
