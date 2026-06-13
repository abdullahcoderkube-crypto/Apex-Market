require('dotenv').config({path: './.env'});
const app = require('./src/app.js')
const db = require('./src/models/index.js');
const PORT = process.env.PORT

async function start() {
  try {
    await db.sequelize.authenticate();
    console.log('Database connected successfully.');

    await db.sequelize.sync();

    app.listen(PORT, () => {
      console.log("Server got started on PORT: ", PORT)
    })
  
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

start();