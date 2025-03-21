import Sequelize from 'sequelize';

const sequelize = new Sequelize('postgres://' + process.env.DB_USERNAME + ':' + process.env.DB_PASSWORD + '@' + process.env.DB_LINK);
//const sequelize = new Sequelize('postgres://' + 'q100va' + ':' + '102Verbluda!' + '@' + 'localhost:5432/cards');
 export default sequelize;
