const { Model, DataTypes, UUIDV4 } = require('sequelize');

module.exports = (sequelize) => {
  class Otp extends Model {}
  Otp.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: DataTypes.STRING(255),
        unique: true,
        allowNull: false,
      },
      otp_code: {
        type: DataTypes.STRING(6),
        allowNull: false,
      },
      expires_at: {
        type: DataTypes.DATE, // Maps to TIMESTAMP WITH TIME ZONE in PostgreSQL
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE, 
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'Otp',
      tableName: 'otps',
      timestamps: false, // Disables automatic createdAt/updatedAt since we defined them manually
    }
  );
  
  return Otp;
};