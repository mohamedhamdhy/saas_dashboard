'use strict';
import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
  await queryInterface.addColumn('users', 'phoneNumber', {
    type: DataTypes.STRING,
    allowNull: true,
  });

  await queryInterface.addColumn('users', 'isActive', {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  });
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.removeColumn('users', 'phoneNumber');
  await queryInterface.removeColumn('users', 'isActive');
}
