const { Product, Order, OrderItem, sequelize } = require('../models')
const { Op } = require('sequelize')

/**
 * Expire unpaid orders and restore stock after payment timeout
 * Runs as a cron job and handles database transactions safely
 */
async function expireOrders() {
  const transaction = await sequelize.transaction()

  try {
    console.log('Scanning for UNPAID ORDERS... ...')

    const expiredOrders = await Order.findAll({
      where: {
        status: 'unpaid',
        payment_method: {
          [Op.eq]: 'Stripe'
        },
        expiresAt: {
          [Op.lte]: new Date()
        }
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
      skipLocked: true // Skip orders locked by other workers
    })

    // restore stock for each expired order
    for (const order of expiredOrders) {
      const orderedItems = await OrderItem.findAll(
        {
          where: {
            orderId: order.id
          },
          transaction
        }
      )

      // iterate each item of unpaid order
      for (const item of orderedItems) {
        if (order.status !== 'unpaid') {
          continue
        }

        await Product.increment('stock', {
          by: item.quantity,
          where: {
            id: item.productId
          },
          transaction
        })

        await item.destroy();
      }

      await order.update(
        {
          status: 'cancelled'
        },
        {
          transaction
        }
      )

      console.log(
        `Order ${order.id} has been Cancelled, due to delay in payment. All the products in the order has been successfully restored.`
      )
    }

    await transaction.commit()
    console.log(`Successfully processed ${expiredOrders.length} expired order(s)`)
  } catch (err) {
    await transaction.rollback()
    console.error('Error in expireOrders job:', err)
  }
}

module.exports = { expireOrders }
