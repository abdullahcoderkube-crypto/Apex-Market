
// Importing Sequelize constructor from the sequelize package.
const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({path: path.resolve(__dirname, '../.env')})


const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      ssl: {
        require: true,                   // Forces SSL connection required by Supabase
        rejectUnauthorized: false        // Prevents connection errors with cloud certificates
      }
    },
    define: {
      underscored: true,
      timestamps: true,
    },
  }
);


// Asynchronous function to establish a connection to the database and synchronize the models.
const connectDB = async () => {
  try {
    // Synchronizes all defined models to the database.
    // 'alter: false' ensures the database should not be altered.
    await sequelize.sync({ alter: false });
    console.log('Connection has been established successfully.'); // Success message
  } catch (error) {
    console.error('Unable to connect to the database:', error); // Error handling
  }
};

// Exporting the sequelize instance and connectDB function to be used in other parts of the application.
module.exports = { sequelize, connectDB };
                
                