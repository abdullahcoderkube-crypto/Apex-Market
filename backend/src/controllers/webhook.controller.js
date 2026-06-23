const { Order, Payment } = require('../models');
const {sendOrderConfirmationEmail} = require('../services/email.service')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); 

const handleStripeWebhook = async (req, res) => {

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify the event came from Stripe using your webhook secret
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`❌ Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle the validated Stripe event type
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log(`💰 Payment succeeded for session: ${session.id}`);

        const orderId = session.metadata.orderId;           // Your internal DB order ID
        const userEmail = session.metadata.userEmail;
        const transactionId = session.payment_intent;       // Stripe's unique transaction reference
        const amount = session.amount_total / 100;          // Convert cents to standard format
        const paidAt = new Date(event.created * 1000);      // Convert Unix timestamp to JS Date

        // Update the order status to 'paid' in Sequelize/PostgreSQL
        const [affectedCount] = await Order.update(
          { status: 'paid' },
          { where: { id: orderId } }
        );
        console.log(`📦 Order ${orderId} updated. Rows affected: ${affectedCount}`);

        // Create a record in your payment table
        const userPayment = await Payment.create({
          orderId: orderId,
          provider: 'stripe', 
          transactionId: transactionId,
          amount: amount, 
          status: 'success',
          paidAt: paidAt
        });
        console.log(`💳 Payment entry created: ${userPayment.id}`);
        await sendOrderConfirmationEmail(userEmail, orderId, amount)
        break;

      case 'invoice.payment_failed':
        const invoice = event.data.object;
        console.log(`⚠️ Payment failed for invoice: ${invoice.id}`);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.status(200).json({ received: true });

  } catch (err) {
    console.error("❌ Webhook Internal Processing Error:", err);
    // Return a 500 error so Stripe knows the DB update failed and will retry sending it
    res.status(500).json({ error: "Database error!" });
  }
};

module.exports = handleStripeWebhook;