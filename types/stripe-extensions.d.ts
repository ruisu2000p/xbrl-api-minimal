/**
 * Stripe SDK type extensions for methods not yet in official type definitions
 */

import 'stripe';

declare module 'stripe' {
  namespace Stripe {
    interface InvoicesResource {
      /**
       * Retrieves an upcoming invoice preview
       * https://docs.stripe.com/api/invoices/upcoming
       */
      retrieveUpcoming(
        params?: InvoiceRetrieveUpcomingParams,
        options?: RequestOptions
      ): Promise<Invoice>;
    }

    interface InvoiceRetrieveUpcomingParams {
      customer?: string;
      subscription?: string;
      subscription_proration_date?: number;
      subscription_items?: Array<{
        id: string;
        deleted?: boolean;
        price?: string;
        quantity?: number;
      }>;
      [key: string]: any;
    }
  }
}
