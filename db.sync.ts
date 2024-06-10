import {OcpiSequelizeInstance} from './src/util/sequelize';
import {OcpiServerConfig} from './src/config/ocpi.server.config';

const ocpiSequelizeInstance = new OcpiSequelizeInstance(new OcpiServerConfig());
const sequelize = ocpiSequelizeInstance.sequelize;

const syncDatabase = async () => {
  try {
    await sequelize.sync({alter: true}); // Use { force: true } for dropping and recreating tables
    console.log('Database synchronized successfully');
  } catch (error) {
    console.error('Error synchronizing database:', error);
  }
};

syncDatabase().then();
