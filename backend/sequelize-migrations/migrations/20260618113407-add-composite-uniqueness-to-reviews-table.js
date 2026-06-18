'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addIndex('reviews', ['user_id', 'product_id'], {
      unique: true, 
      name: 'valid-unique-review'
    })
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeIndex('reviews', 'valid-unique-review')
  }
};
