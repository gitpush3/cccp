import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27-prelease' as any, // Using latest or specified
});

export class StripeService {
  /**
   * Create a new customer or retrieve an existing one by email.
   */
  async getOrCreateCustomer(email: string, name?: string): Promise<Stripe.Customer> {
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length > 0) {
      return customers.data[0];
    }
    return await stripe.customers.create({ email, name });
  }

  /**
   * Create a Payment Intent for the initial deposit.
   * setup_future_usage: 'off_session' allows us to charge the card later.
   */
  async createDepositIntent(customerId: string, amount: number) {
    return await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects cents
      currency: 'usd',
      customer: customerId,
      setup_future_usage: 'off_session',
      metadata: {
        type: 'deposit',
      },
    });
  }

  /**
   * Charge a saved payment method off-session for an installment.
   */
  async createInstallmentCharge(customerId: string, amount: number, paymentMethodId: string) {
    try {
      const intent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        metadata: {
          type: 'installment',
        },
      });
      return intent;
    } catch (error: any) {
      if (error.code === 'authentication_required') {
        // This is where manual process is triggered as per requirements
        console.error('Authentication required for off-session payment', error.payment_intent.id);
        throw new Error('OFF_SESSION_AUTH_REQUIRED');
      }
      throw error;
    }
  }

  /**
   * Get the default payment method for a customer.
   */
  async getDefaultPaymentMethod(customerId: string): Promise<string | null> {
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    if (typeof customer.invoice_settings?.default_payment_method === 'string') {
      return customer.invoice_settings.default_payment_method;
    }
    
    // Fallback: list payment methods and take the first card
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    
    return paymentMethods.data.length > 0 ? paymentMethods.data[0].id : null;
  }
}
