import nodemailer from 'nodemailer'
import { getEnv } from '../config/env'

/**
 * SMTP transporter. Built lazily so getEnv() (fail-fast zod) runs before
 * the first send rather than at module import time — this keeps unit
 * tests that mock the module free of env-var boilerplate, while still
 * producing a loud error on real cold start if SMTP creds are missing.
 */
let cachedTransporter: nodemailer.Transporter | null = null
function getTransporter() {
    if (cachedTransporter) return cachedTransporter
    const env = getEnv()
    cachedTransporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
        },
    })
    return cachedTransporter
}

function senderEmail() {
    return getEnv().EMAIL_FROM
}

function frontendUrl() {
    // FRONTEND_URL is not in the zod schema yet; fall back to a sane dev default.
    return process.env.FRONTEND_URL || 'http://localhost:5173'
}

export interface EmailOptions {
    to: string
    subject: string
    html: string
    attachments?: Array<{
        filename: string
        content: Buffer | string
        contentType?: string
    }>
}

export const sendEmail = async (options: EmailOptions) => {
    try {
        const info = await getTransporter().sendMail({
            from: `"PicSonar" <${senderEmail()}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
            attachments: options.attachments
        })
        console.log(`Email sent: ${info.messageId}`)
    } catch (error) {
        console.error('Error sending email via Brevo:', error)
        throw new Error('Failed to send email')
    }
}

export const sendVerifyEmailEmail = async (email: string, token: string) => {
    const verifyLink = `${frontendUrl()}/verify-email?token=${encodeURIComponent(token)}`
    await sendEmail({
        to: email,
        subject: 'Confirm your PicSonar email',
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #333;">Confirm your email</h2>
                <p>Welcome to PicSonar. Please confirm this is your email address by clicking the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verifyLink}" style="background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Confirm email</a>
                </div>
                <p>If the button does not work, copy this link into your browser:</p>
                <p style="word-break: break-all; font-size: 13px; color: #555;">${verifyLink}</p>
                <p>The link expires in 24 hours. If you did not create a PicSonar account, you can safely ignore this message.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #777;">&copy; PicSonar. This is an automated transactional message.</p>
            </div>
        `,
    })
}

export const sendResetPasswordEmail = async (email: string, token: string) => {
    const resetLink = `${frontendUrl()}/reset-password?token=${token}`

    await sendEmail({
        to: email,
        subject: "Reset Your Password - PicSonar",
        html: `
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
        `
    })
}
