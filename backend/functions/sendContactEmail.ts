import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { successResponse, errorResponse } from "../src/utils/response";

const sesClient = new SESClient({ region: process.env.REGION || "eu-central-1" });
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@picsonar.com";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        if (!event.body) return errorResponse("Body missing", 400);
        const { name, email, message } = JSON.parse(event.body);

        if (!name || !email || !message) {
            return errorResponse("Missing fields", 400);
        }

        const command = new SendEmailCommand({
            Source: SUPPORT_EMAIL,
            Destination: { ToAddresses: [SUPPORT_EMAIL] },
            ReplyToAddresses: [email],
            Message: {
                Subject: { Data: `New Contact Form Message from ${name}` },
                Body: {
                    Html: {
                        Data: `
                            <h3>New Message from PicSonar Contact Form</h3>
                            <p><strong>Name:</strong> ${name}</p>
                            <p><strong>Email:</strong> ${email}</p>
                            <p><strong>Message:</strong></p>
                            <p>${message}</p>
                        `
                    }
                }
            }
        });

        await sesClient.send(command);
        return successResponse({ message: "Message sent successfully" });
    } catch (err: any) {
        console.error("SES Error:", err);
        return errorResponse("Failed to send message", 500);
    }
};
