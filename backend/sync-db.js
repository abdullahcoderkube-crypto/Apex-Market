const { sequelize } = require('./src/models/index');

sequelize.sync({ alter: true })
  .then(() => {
    console.log('Database synced successfully with alter: true');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error syncing database:', error);
    process.exit(1);
  });
