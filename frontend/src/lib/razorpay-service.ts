// Razorpay Integration Service
// Handles payment processing and subscription management

interface RazorpayConfig {
  apiKey: string
  apiSecret: string
}

// Note: In production, API secret should be used only on backend/Cloud Functions
// Frontend will use only the API key

export const razorpayService = {
  /**
   * Create a subscription on Razorpay
   * This should be called from a Cloud Function, not frontend
   */
  async createSubscription(
    customerId: string,
    planId: string,
    subscriptionDetails: {
      totalCount: number // 12 for yearly, 12 for monthly
      quantity?: number
      customerNotify?: boolean
    },
  ) {
    // This would be called via a Cloud Function
    // Frontend would call an API endpoint that triggers this
    const endpoint = "/api/billing/create-subscription"
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        planId,
        ...subscriptionDetails,
      }),
    })
    return response.json()
  },

  /**
   * Create Razorpay customer from company details
   */
  async createCustomer(companyDetails: {
    name: string
    email: string
    contact?: string
  }) {
    const endpoint = "/api/billing/create-customer"
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(companyDetails),
    })
    return response.json()
  },

  /**
   * Process one-time payment for trial conversion
   */
  async processPayment(paymentDetails: {
    customerId: string
    amount: number
    currency: string
    receiptId: string
    description: string
  }) {
    const endpoint = "/api/billing/process-payment"
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentDetails),
    })
    return response.json()
  },

  /**
   * Validate webhook signature from Razorpay
   */
  validateWebhookSignature(body: string, signature: string, secret: string): boolean {
    const crypto = require("crypto")
    const hash = crypto.createHmac("sha256", secret).update(body).digest("hex")
    return hash === signature
  },

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string) {
    const endpoint = `/api/billing/payment-status/${paymentId}`
    const response = await fetch(endpoint)
    return response.json()
  },

  /**
   * Refund a payment
   */
  async refundPayment(paymentId: string, amount?: number, notes?: string) {
    const endpoint = "/api/billing/refund"
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, amount, notes }),
    })
    return response.json()
  },

  /**
   * Generate invoice (calls Cloud Function)
   */
  async generateInvoice(subscriptionId: string, companyId: string) {
    const endpoint = "/api/billing/generate-invoice"
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionId, companyId }),
    })
    return response.json()
  },
}
