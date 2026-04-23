export const getInvoiceEmailTemplate = (companyName: string, orderId: string, amount: number) => {
    return {
        subject: `Your PicSonar Invoice (Order #${orderId})`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #333;">Payment Verified & Invoice Attached</h2>
                <p>Hello ${companyName},</p>
                <p>Thank you for your purchase. We have successfully processed your payment of <b>${(amount / 100).toFixed(2)} RON</b>.</p>
                <p>Please find your invoice attached to this email.</p>
                <br>
                <p>Best Regards,</p>
                <p><b>The PicSonar Team</b></p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #777;">&copy; 2024 PicSonar. All rights reserved.</p>
            </div>
        `
    }
}
