const { Model, DataTypes, UUIDV4 } = require('sequelize');

module.exports = (sequelize) => {
  class Order extends Model {}

  Order.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      addressId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      netAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      payment_method: {
        type: DataTypes.ENUM(
          'Stripe', 
          'COD'
        ),
        allowNull: false
      }, 
      status: {
        type: DataTypes.ENUM(
          'unpaid',
          'paid',        
          'cancelled',
          'shipped'
        ),
        allowNull: false,
        defaultValue: 'unpaid',
      },
      jdShipmentId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      jdAwb: {
        type: DataTypes.STRING,
        allowNull: true
      },
      jdCourier: {
        type: DataTypes.STRING,
        allowNull: true
      },
      jdLabelUrl: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Order',
      tableName: 'orders',
    }
  );

  return Order;
};