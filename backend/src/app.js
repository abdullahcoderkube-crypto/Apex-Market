const express = require('express')
const cron = require('node-cron')
const authRouter = require('./routes/auth.routes')
const inventoryRouter = require('./routes/inventory.routes')
const productsRouter = require('./routes/products.routes')
const checkoutRouter = require('./routes/checkout.routes')
const ordersRouter = require('./routes/orders.routes')
const analyticsRouter = require('./routes/analytics.routes')
const handleStripeWebhook = require('./controllers/webhook.controller')
const { expireOrders } = require('./jobs/expireOrders.job')
const cors = require('cors');
const app = express();

app.post('/api/stripe/webhook', express.raw({ type: 'application/json'}), handleStripeWebhook);

app.use(express.json());
app.use(cors());

// route all requests to authRouter which starts from /auth
app.use('/auth', authRouter);

// for inventory management
app.use('/api/vendor', inventoryRouter);

// for customers
app.use('/api/products', productsRouter);
 
// for checkout
app.use('/api/checkout', checkoutRouter);

// for order history
app.use('/api/orders', ordersRouter);

// for vendor analytics dashboard
app.use('/api/vendor/', analyticsRouter);

// Schedule expireOrders job to run every 1 minute
cron.schedule('* * * * *', async () => {
  try {
    await expireOrders()
  } catch (err) {
    console.error('Cron job error:', err)
  }
})

module.exports = app