import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { successResponse, errorResponse } from "../src/utils/response";
import { sendEmail } from "../src/utils/email";
import { enforceRateLimit, rateLimitIdentity } from "../src/middleware/rateLimit";

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@picsonar.com";

function sanitizeHeader(value: string): string {
    // Strip CR/LF to prevent email header injection
    return value.replace(/[\r\n]/g, ' ').trim()
}

function stripHtml(value: string): string {
    return value.replace(/<[^>]*>/g, '')
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        // 5 messages per IP per 10 minutes — prevents inbox flooding
        const identity = rateLimitIdentity(event)
        await enforceRateLimit({ endpoint: 'contact', identity, max: 5, windowSec: 600 })

        if (!event.body) return errorResponse("Body missing", 400);
        const { name, email, message } = JSON.parse(event.body);

        if (!name || !email || !message) {
            return errorResponse("Missing fields", 400);
        }

        if (typeof name !== 'string' || name.length > 200) return errorResponse("Invalid name", 400)
        if (typeof email !== 'string' || email.length > 254) return errorResponse("Invalid email", 400)
        if (typeof message !== 'string' || message.length > 10000) return errorResponse("Message too long", 400)

        // Sanitize user-controlled values before embedding in email headers/body
        const safeName = sanitizeHeader(name)
        const safeEmail = sanitizeHeader(email)
        const safeMessage = stripHtml(message).slice(0, 10000)

        await sendEmail({
            to: SUPPORT_EMAIL,
            subject: `New Contact Form Message from ${safeName}`,
            html: `
                <h3>New Message from PicSonar Contact Form</h3>
                <p><strong>Name:</strong> ${safeName}</p>
                <p><strong>Email:</strong> ${safeEmail}</p>
                <p><strong>Message:</strong></p>
                <pre style="white-space:pre-wrap">${safeMessage}</pre>
            `
        });

        return successResponse({ message: "Message sent successfully" });
    } catch (err: any) {
        if (err?.statusCode === 429) {
            return errorResponse("Too many requests. Please try again later.", 429)
        }
        console.error("Email Error:", err);
        return errorResponse("Failed to send message", 500);
    }
};
