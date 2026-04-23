import { PDFDocument, rgb } from 'pdf-lib'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import crypto from 'crypto'
import { getEnv } from '../config/env'

// AWS_REGION is the standard SDK env; REGION was the legacy name kept
// for back-compat. getEnv() guarantees AWS_REGION exists.
const s3Client = new S3Client({
    region: process.env.AWS_REGION || process.env.REGION || 'eu-central-1',
})

function invoicesBucket(): string {
    const env = getEnv()
    if (!env.INVOICES_BUCKET) {
        throw new Error(
            'INVOICES_BUCKET is required for invoice generation but is not set',
        )
    }
    return env.INVOICES_BUCKET
}

export interface InvoiceData {
    orderId: string
    date: string
    companyName: string
    cui: string
    address: string
    packageName: string
    amount: number
    currency: string
}

export async function generateAndUploadInvoice(data: InvoiceData): Promise<string> {
    try {
        const pdfDoc = await PDFDocument.create()
        const page = pdfDoc.addPage([595, 842]) // A4 size

        const { width, height } = page.getSize()
        const fontSize = 12

        page.drawText('PicSonar Invoice', {
            x: 50,
            y: height - 50,
            size: 24,
            color: rgb(0.1, 0.1, 0.1),
        })

        page.drawText(`Invoice #${data.orderId}`, { x: 50, y: height - 100, size: fontSize })
        page.drawText(`Date: ${data.date}`, { x: 50, y: height - 120, size: fontSize })

        page.drawText(`Billed To:`, { x: 50, y: height - 160, size: fontSize, color: rgb(0.5, 0.5, 0.5) })
        page.drawText(data.companyName, { x: 50, y: height - 180, size: fontSize })
        page.drawText(`CUI: ${data.cui}`, { x: 50, y: height - 200, size: fontSize })
        page.drawText(`Address: ${data.address}`, { x: 50, y: height - 220, size: fontSize })

        page.drawText(`Description`, { x: 50, y: height - 280, size: fontSize, color: rgb(0.5, 0.5, 0.5) })
        page.drawText(`Amount`, { x: 450, y: height - 280, size: fontSize, color: rgb(0.5, 0.5, 0.5) })

        page.drawText(data.packageName, { x: 50, y: height - 310, size: fontSize })
        page.drawText(`${(data.amount / 100).toFixed(2)} ${data.currency}`, { x: 450, y: height - 310, size: fontSize })

        const pdfBytes = await pdfDoc.save()

        const invoiceKey = `invoices/${data.orderId}-${crypto.randomBytes(4).toString('hex')}.pdf`

        await s3Client.send(new PutObjectCommand({
            Bucket: invoicesBucket(),
            Key: invoiceKey,
            Body: Buffer.from(pdfBytes),
            ContentType: 'application/pdf',
            ServerSideEncryption: 'AES256'
        }))

        return invoiceKey
    } catch (error) {
        console.error('Invoice generation failed:', error)
        throw new Error('Failed to generate invoice')
    }
}
