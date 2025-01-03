import 'reflect-metadata';
import { OcpiSequelizeInstance, ServerConfig } from '@citrineos/ocpi-base';

const ocpiSequelizeInstance = new OcpiSequelizeInstance(new ServerConfig());
const sequelize = ocpiSequelizeInstance.sequelize;

const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true }); // Use { force: true } for dropping and recreating tables
    console.log('Database synchronized successfully');
  } catch (error) {
    console.error('Error synchronizing database:', error);
  }
};

syncDatabase().then();
