import sequelize from '../database.js';
import AuditLogModel from './audit-log.js';
import Role from './role.js';
import Locality from './locality.js';
import District from './district.js';
import Region from './region.js';
import Country from './country.js';
import UserAddress from './user-address.js';
import UserContact from './user-contact.js';
import User from './user.js';
import Operation from './operation.js';
import SearchUser from './search-user.js';
import OutdatedName from './outdated-name.js';
import RefreshToken from './refresh-token.js';

const AuditLog = AuditLogModel(sequelize);


User.hasMany(UserContact, { as: 'contacts' }, {
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
UserContact.belongsTo(User);

Country.hasMany(Region, {
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
Region.belongsTo(Country);
/* Region.belongsToMany(Region, { through: 'NearbyRegions', as: 'mainRegion' });
Region.belongsToMany(Region, { through: 'NearbyRegions', as: 'neighbor' }); */
Region.hasMany(District, {
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
District.belongsTo(Region);
District.hasMany(Locality, {
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
Locality.belongsTo(District);

User.hasMany(UserAddress, { as: 'addresses' }, {
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
UserAddress.belongsTo(User);
UserAddress.belongsTo(Country);
UserAddress.belongsTo(Region);
UserAddress.belongsTo(District);
UserAddress.belongsTo(Locality);
Country.hasMany(UserAddress, {
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
Region.hasMany(UserAddress, {
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
District.hasMany(UserAddress, {
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
Locality.hasMany(UserAddress, {
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

User.hasMany(SearchUser, {
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
SearchUser.belongsTo(User);

User.hasMany(OutdatedName, { as: 'outdatedNames' }, {
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

OutdatedName.belongsTo(User);

User.belongsTo(Role);
Role.hasMany(User, {
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

Role.hasMany(Operation, {
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
Operation.belongsTo(Role);

export { AuditLog, Role, Locality, District, Region, Country, UserAddress, UserContact, User, SearchUser, Operation, OutdatedName, RefreshToken};

