require('dotenv').config();
const app = require('./src/app.js')
const db = require('./src/models/index.js');
const agenda = require('./src/jobs/expireOrders.job.js');
const PORT = process.env.PORT

async function start() {
  try {
    await db.sequelize.authenticate();
    console.log('Database connected successfully.');

    await db.sequelize.sync();

    await agenda.every('1 minute', 'expire-orders')

    app.listen(PORT, () => {
      console.log("Server got started on PORT: ", PORT)
    })
  
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

start();