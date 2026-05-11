/**
 * SmartBill API client — creates fiscal invoices after successful payments.
 * API docs: https://api.smartbill.ro
 *
 * Auth: Basic (username = SmartBill email, password = API token)
 * All amounts are in RON, excluding VAT. VAT rate: 19%.
 */
import https from 'https'
import { logger } from './logger'

const SMARTBILL_BASE = 'https://ws.smartbill.ro/SBORO/api'
const VAT_RATE = 19

export interface SmartBillInvoiceParams {
  username: string
  token: string
  sellerCif: string
  seriesName: string

  // Customer
  clientName: string
  clientCif?: string
  clientStreet?: string
  clientCity?: string
  clientCountry?: string
  clientEmail?: string
  isVatPayer?: boolean

  // Invoice
  issueDate: string       // YYYY-MM-DD
  productName: string
  amountWithVatRON: number // gross amount (what customer paid)
  currency: string
  orderId: string
}

export interface SmartBillInvoiceResult {
  invoiceNumber: string
  seriesName: string
  url?: string
}

function basicAuth(username: string, token: string): string {
  return 'Basic ' + Buffer.from(`${username}:${token}`).toString('base64')
}

async function smartbillRequest(
  method: 'GET' | 'POST',
  path: string,
  auth: string,
  body?: object,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : undefined
    const options: https.RequestOptions = {
      hostname: 'ws.smartbill.ro',
      path: `/SBORO/api${path}`,
      method,
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`SmartBill ${res.statusCode}: ${JSON.stringify(parsed)}`))
          } else {
            resolve(parsed)
          }
        } catch {
          reject(new Error(`SmartBill non-JSON response: ${data}`))
        }
      })
    })

    req.on('error', reject)
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

export async function createSmartBillInvoice(
  params: SmartBillInvoiceParams,
): Promise<SmartBillInvoiceResult> {
  const auth = basicAuth(params.username, params.token)

  // Convert gross amount to net + VAT
  const grossRON = params.amountWithVatRON
  const netRON = parseFloat((grossRON / (1 + VAT_RATE / 100)).toFixed(2))
  const vatAmountRON = parseFloat((grossRON - netRON).toFixed(2))

  const payload = {
    companyVatCode: params.sellerCif,
    client: {
      name: params.clientName,
      vatCode: params.clientCif ?? '',
      address: params.clientStreet ?? '',
      city: params.clientCity ?? '',
      country: params.clientCountry ?? 'Romania',
      email: params.clientEmail ?? '',
      isTaxPayer: params.isVatPayer ?? !!params.clientCif,
      saveToDb: true,
    },
    issueDate: params.issueDate,
    seriesName: params.seriesName,
    currency: params.currency === 'RON' ? 'RON' : params.currency,
    language: 'RO',
    precision: 2,
    mentions: `Order ID: ${params.orderId}`,
    useStock: false,
    products: [
      {
        name: params.productName,
        measuringUnitName: 'buc',
        currency: params.currency === 'RON' ? 'RON' : params.currency,
        quantity: 1,
        price: netRON,
        isTaxIncluded: false,
        taxName: 'Normala',
        taxPercentage: VAT_RATE,
        isDiscount: false,
        isService: true,
        saveToDb: false,
      },
    ],
  }

  logger.info('smartbill.invoice.creating', {
    orderId: params.orderId,
    clientName: params.clientName,
    grossRON,
    netRON,
  })

  const result = await smartbillRequest('POST', '/invoice', auth, payload)

  if (!result.series || !result.number) {
    throw new Error(`SmartBill unexpected response: ${JSON.stringify(result)}`)
  }

  logger.info('smartbill.invoice.created', {
    orderId: params.orderId,
    invoiceNumber: result.number,
    seriesName: result.series,
  })

  return {
    invoiceNumber: String(result.number),
    seriesName: result.series,
  }
}

export async function getSmartBillInvoicePdf(
  username: string,
  token: string,
  cif: string,
  seriesName: string,
  invoiceNumber: string,
): Promise<Buffer> {
  const auth = basicAuth(username, token)
  const path = `/invoice/pdf?cif=${encodeURIComponent(cif)}&seriesname=${encodeURIComponent(seriesName)}&number=${encodeURIComponent(invoiceNumber)}`

  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      hostname: 'ws.smartbill.ro',
      path: `/SBORO/api${path}`,
      method: 'GET',
      headers: {
        Authorization: auth,
        Accept: 'application/octet-stream',
      },
    }

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`SmartBill PDF ${res.statusCode}`))
        } else {
          resolve(Buffer.concat(chunks))
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}
