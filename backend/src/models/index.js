const { sequelize } = require('../db/dbConfig');

const User = require('./user.model')(sequelize);
const Vendor = require('./vendor.model')(sequelize);
const Otp = require('./otp.model')(sequelize);
const Category = require('./category.model')(sequelize);
const Product = require('./product.model')(sequelize);
const Address = require('./address.model')(sequelize);
const Order = require('./order.model')(sequelize);
const OrderItem = require('./orderItem.model')(sequelize);
const Payment = require('./payment.model')(sequelize);


/* Associations */

// User ↔ Vendor
User.hasOne(Vendor, { foreignKey: 'userId', as: 'vendor' });
Vendor.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User ↔ Address
User.hasMany(Address, { foreignKey: 'userId', as: 'addresses' });
Address.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User ↔ Order
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Address ↔ Order
Address.hasMany(Order, { foreignKey: 'addressId', as: 'orders' });
Order.belongsTo(Address, { foreignKey: 'addressId', as: 'address' });

// Vendor ↔ Product
Vendor.hasMany(Product, { foreignKey: 'vendorId', as: 'products' });
Product.belongsTo(Vendor, { foreignKey: 'vendorId', as: 'vendor' });

// Category ↔ Product
Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

// Order ↔ OrderItem
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

// Product ↔ OrderItem
Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems' });
OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// Order ↔ Payment
Order.hasOne(Payment, { foreignKey: 'orderId', as: 'payment' });
Payment.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });



const db = {
  sequelize,
  Sequelize: require('sequelize'),
  User,
  Vendor,
  Otp,
  Category,
  Product,
  Address,
  Order,
  OrderItem,
  Payment,
};

module.exports = db;