const { Address, Order, OrderItem, Product, Coupon, CouponUsage, User, sequelize} = require('../models');
const { Op } = require('sequelize');
const {sendOrderConfirmationEmail} = require('../services/email.service')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const processCheckout = async (req, res) => {
    const { fullName, address, city, state, postalCode, phoneNumber, userId, totalAmount, netAmount, paymentMethod, items, couponId } = req.body;

    let quantity = null;
    let orderId = null;
    try {
        // Track out-of-stock items outside the transaction scope
        let outOfStockItems = [];

        // User email address for mail sending
        const user = await User.findOne({
            where: {
                id: userId,
            }, attributes: ['email']
        });

        const userEmail = user.email; 

        // Run EVERYTHING inside the managed transaction block
        await sequelize.transaction(async (t) => { 
            
            // 1. Move Address creation inside the transaction so it rolls back if checkout fails
            const userAddress = await Address.create({ 
                userId: userId,
                fullName: fullName,
                phone: phoneNumber,
                addressLine1: address,
                city: city,
                state: state,
                postalCode: postalCode
            }, { transaction: t });

            // 2. Validate and lock stock for each item
            for (const item of items) {
                const product = await Product.findOne({
                    where: {
                        id: item.productId,
                        stock: { [Op.gte]: item.quantity }
                    }, 
                    attributes: ['name', 'id', 'stock'],
                    transaction: t, 
                    lock: t.LOCK.UPDATE, // Row-level lock prevents race conditions
                });

                // If product is null, it means it is out of stock
                if (!product) {
                    outOfStockItems.push({ id: item.productId, name: item.productName });
                    continue; // Gather all out of stock items instead of failing on the first one
                }

                // Deduct stock safely using the locked instance
                await product.update({
                    stock: product.stock - item.quantity,
                }, { transaction: t });
            }

            // 3. If any items were out of stock, throw a custom error to force a database ROLLBACK
            if (outOfStockItems.length > 0) {
                const error = new Error("Stock validation failed");
                error.type = "STOCK_ERROR";
                error.data = outOfStockItems;
                throw error; // This triggers the rollback immediately
            }
            
            // 4. Create Unpaid Order
            const userOrder = await Order.create({
                userId: userId,
                addressId: userAddress.id,
                totalAmount: totalAmount,
                netAmount: netAmount,
                payment_method: paymentMethod,
                expiresAt: new Date(Date.now() + (15 * 60 * 1000)) // Explicit Date object for Postgres timestamp
            }, { transaction: t });

            console.log("Order created:", userOrder.toJSON())
            
            // 5. Record coupon usage
            if (couponId && typeof(couponId) === 'string') {
                await CouponUsage.create({
                    userId: userId, 
                    couponId: couponId,
                    orderId: userOrder.id,
                    usedAt: new Date(Date.now())
                }, {transaction: t});
            
                // increment coupon usage count
                await Coupon.increment('usedCount', {
                    by: 1, 
                    where: {
                        id: couponId
                    }
                }, {transaction: t})
            }
            

            // 6. Insert order items
            for (const item of items) {
                await OrderItem.create({
                    orderId: userOrder.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price
                }, { transaction: t });
            }
           
            // populate the orderId var for further usage
            orderId = userOrder.id;
        }); 

        // 7. Create a Stripe checkout session
        let stripeUrl = null;
        if (paymentMethod === 'Stripe') {
            const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: { name: 'Customer Order' },
                    unit_amount: Math.round(netAmount * 100),
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: 'https://apexvendor.netlify.app/checkout/success',
            cancel_url: 'https://apexvendor.netlify.app/checkout/failure',
    
            //custom config, for futher usage in webhook
            metadata: {
                orderId: orderId.toString(),
                userEmail
            }
        })
        stripeUrl = session.url;
        }

        // send order confirmation email (only for COD orders)
        if (paymentMethod === 'COD') {
            await sendOrderConfirmationEmail(userEmail, orderId, netAmount, address);
        }
        
        // If execution reaches here, transaction committed successfully!
        res.status(201).json({
            success: true,
            message: "Order initiated successfully",
            url: stripeUrl
        });


    } catch (err) {
        console.error(err)
        // Handle your custom rollback exception cleanly
        if (err.type === "STOCK_ERROR") {
            return res.status(409).json({
                success: false,
                message: "Some items are out of stock.",
                outOfStockItems: err.data               
            });
        }

        if (err.message === 'Validation error') {
            return res.status(403).json({
                success: false,
                message: "Coupon already used by this account."
            })
        }

        // Handle generic database or server system errors
        return res.status(500).json({
            success: false,
            error: "Internal Server Error !"
        });
    }
};

module.exports = processCheckout;
