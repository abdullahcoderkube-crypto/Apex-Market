const {Order, OrderItem, Product, Address, Reviews} = require('../models');

const getAllOrders = async (req, res) => {

    try {
        const orders = await Order.findAll({
        where: {
            userId: req.user.userId
        }
    })

    res.status(200).json({
        success: true,
        orders
    })
    } catch (err) {
        console.error(err)
    }
}

const getOrderById = async (req, res) => {
    try {
        const order = await Order.findOne({
  where: {
    id: req.params.id,
    userId: req.user.userId,
  },
  include: [
    {
      model: OrderItem,
      as: 'items',
      include: [
        {
          model: Product,
          as: 'product',
          attributes: [
            'id',
            'name',
            'image_urls'
          ],
          include: [
            {
              model: Reviews,
              as: 'reviews',
              required: false,
              where: { user_id: req.user.userId }
            }
          ]
        }
      ]
    },
    {
      model: Address,
      as: 'address'
    }
  ]
});

res.status(200).json({
    status: true,
    order
})
    } catch (err) {
        console.error(err)
    }
}

module.exports = {getAllOrders, getOrderById};