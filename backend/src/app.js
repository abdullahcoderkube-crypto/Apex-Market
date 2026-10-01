const express = require('express')
const cron = require('node-cron')
const cookieParser = require('cookie-parser')
const authRouter = require('./routes/auth.routes')
const inventoryRouter = require('./routes/inventory.routes')
const productsRouter = require('./routes/products.routes')
const checkoutRouter = require('./routes/checkout.routes')
const ordersRouter = require('./routes/orders.routes')
const analyticsRouter = require('./routes/analytics.routes')
const reviewsRouter = require('./routes/reviews.routes')
const wishlistRouter = require('./routes/wishlist.routes')
const couponsRouter = require('./routes/coupons.routes')
const profileRouter = require('./routes/profile.routes')
const handleStripeWebhook = require('./controllers/webhook.controller')
const { expireOrders } = require('./jobs/expireOrders.job')
const cors = require('cors');
const app = express();

app.post('/api/stripe/webhook', express.raw({ type: 'application/json'}), handleStripeWebhook);

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: ['https://apex-market.pages.dev', 'http://localhost:5173', 'http://localhost:5174'], 
  credentials: true
}));

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

// for jd proxy 
const jdRouter = require('./routes/jd.routes');
app.use('/api/jd', jdRouter);

// for Reviews
app.use('/api/reviews', reviewsRouter);

// for customer Wishlist
app.use('/api/wishlist', wishlistRouter);

// for coupon code
app.use('/api/coupons/', couponsRouter)

// for user profile
app.use('/api/profile', profileRouter) ;

// Schedule expireOrders job to run every 1 minute
cron.schedule('* * * * *', async () => {
  try {
    await expireOrders();
  } catch (err) {
    console.error('Cron job error:', err)
  }
})

module.exports = app