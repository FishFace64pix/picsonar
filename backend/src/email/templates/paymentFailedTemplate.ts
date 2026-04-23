/**
 * Payment-failed email template.
 *
 * Sent by the Stripe `payment_intent.payment_failed` webhook handler when a
 * customer's charge fails (card declined, insufficient funds, 3DS abandoned,
 * etc.). We keep the copy reassuring — a failed payment is almost always
 * recoverable (re-enter card, try a different method, contact bank). We do
 * NOT disclose the Stripe raw decline_code / error message verbatim; instead
 * we pass a short human-safe `failureMessage` that the webhook sanitises.
 */
export const getPaymentFailedTemplate = (failureMessage: string) => {
    return {
        subject: 'PicSonar — Payment could not be completed',
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #b91c1c;">Payment unsuccessful</h2>
                <p>Hello,</p>
                <p>We tried to process your recent PicSonar purchase but the payment could not be completed.</p>
                <p style="background: #fef2f2; border-left: 4px solid #b91c1c; padding: 10px 14px; color: #7f1d1d;">
                    <b>Reason:</b> ${failureMessage}
                </p>
                <p>No charge has been made. Common fixes:</p>
                <ul>
                    <li>Double-check the card number, expiry, and CVV.</li>
                    <li>Try a different card (debit vs credit, or a card from another issuer).</li>
                    <li>Your bank may have flagged the transaction — approving it there and retrying usually works.</li>
                </ul>
                <p>You can retry the purchase any time from your account, or reply to this email if you need help.</p>
                <br>
                <p>Best regards,</p>
                <p><b>The PicSonar Team</b></p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #777;">&copy; PicSonar. This is an automated transactional message — please do not reply to this address for unrelated enquiries.</p>
            </div>
        `,
    }
}
