const { Address, Order, OrderItem, Product, Payment, sequelize } = require('../models');
const { Op } = require('sequelize');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const agenda = require('agenda');


const processCheckout = async (req, res) => {
    const { fullName, address, city, state, postalCode, phoneNumber, userId, totalAmount, paymentMethod, items } = req.body;

    let quantity = null;
    let orderId = null;
    try {
        // Track out-of-stock items outside the transaction scope
        let outOfStockItems = [];

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
                payment_method: paymentMethod,
                expiresAt: new Date(Date.now() + (15 * 60 * 1000)) // Explicit Date object for Postgres timestamp
            }, { transaction: t });

            console.log("Order createed:", userOrder.toJSON())

            // 5. Insert order items
            for (const item of items) {
                const temp = await OrderItem.create({
                    orderId: userOrder.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price
                }, { transaction: t });
                console.log("Order ITEM createed:", temp.toJSON())
            }
            // populate the counter variable for further usage
            quantity = await OrderItem.count({
                where: {
                    orderId: userOrder.id
                }, 
                transaction: t
            })

            // populate the orderId var for furthur usage
            orderId = userOrder.id;
        }); 

        // 6. Create a Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: { name: 'Customer Order' },
                    unit_amount: totalAmount * 100,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: 'http://localhost:5173/checkout/success',
            cancel_url: 'http://localhost:5173/checkout/failure',
    
            //Put your Order ID here!
            metadata: {
                orderId: orderId.toString()
            }
        })
        // If execution reaches here, transaction committed successfully!
        return res.status(201).json({
            success: true,
            message: "Order initiated successfully",
            url: session.url
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

        // Handle generic database or server system errors
        console.error(err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error !!!"
        });
    }
};

module.exports = processCheckout;
