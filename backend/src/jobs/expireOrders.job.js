const {Product, Order, OrderItem, sequelize} = require('../models')
const {Op} = require('sequelize')
const { Agenda } = require('agenda');
const { MongoBackend } = require('@agendajs/mongo-backend');
const path = require('path');
const db = require('../models');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env')})
const connectionString = process.env.DATABASE_URL; 

const agenda = new Agenda({
  backend: new MongoBackend({
    address: connectionString
  })
});


 // define job for agenda.js
agenda.define('expire-orders', async () => {
    console.log('Scanning for UNPAID ORDERS... ...')
    const transaction = await sequelize.transaction();

    try {
        const expiredOrders = await Order.findAll({
        where: {
        status: 'unpaid',
        payment_method: {
            [Op.eq]: 'Stripe'
        },
        expiresAt: {
            [Op.lte]: new Date()
            }
        }, transaction: transaction, 
        lock: transaction.LOCK.UPDATE
        });
    // restore stock
    for(const order of expiredOrders) {
        const orderedItems = await OrderItem.findAll({
            where: {
                orderId: order.id
            }, attributes: ['productId', 'quantity']
        })

        // iterate each item of unpaid order
        for (const item of orderedItems) {
            if (order.status !== 'unpaid') {
                continue;
            }

            await Product.increment('stock', { by: item.quantity, where: {
                id: item.productId
            }, transaction: transaction})
        }
        

        await order.update({
            status: 'cancelled'
        }, 
        {
            transaction: transaction
        });
        
        console.log(`Order ${order.id} has been Cancelled, due to delay in payment. \n All the products in the order has been successfully restored.` )
        
        }
        await transaction.commit();

} catch(err) {
   await transaction.rollback();
}

});




// start the agenda
(async function () {
  try {
    await agenda.start();
    console.log('Agenda started');
  } catch (err) {
    console.error('Agenda failed to start:', err);
  }
})();

module.exports = agenda;
