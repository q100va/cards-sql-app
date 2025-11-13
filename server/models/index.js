import sequelize from '../database.js';
import AuditLogModel from './audit-log.js';
import Role from './role.js';
import LocalityModel from './locality.js';
import DistrictModel from './district.js';
import RegionModel from './region.js';
import CountryModel from './country.js';
import UserAddressModel from './user-address.js';
import UserContact from './user-contact.js';
import User from './user.js';
import UserSearch from './search-user.js';
import OutdatedName from './outdated-name.js';
import RefreshToken from './refresh-token.js';
import RolePermissionModel from './role-permission.js';


const AuditLog = AuditLogModel(sequelize);
const RolePermission = RolePermissionModel(sequelize);
const Country = CountryModel(sequelize);
const Region = RegionModel(sequelize);
const District = DistrictModel(sequelize);
const Locality = LocalityModel(sequelize);
const UserAddress = UserAddressModel(sequelize);

User.hasMany(UserContact, { as: 'contacts' }, {
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
  hooks: true
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
  hooks: true
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

User.hasMany(UserSearch, {
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
  hooks: true
});
UserSearch.belongsTo(User);

User.hasMany(OutdatedName, { as: 'outdatedNames' }, {
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
  hooks: true
});

OutdatedName.belongsTo(User);

User.belongsTo(Role);
Role.hasMany(User, {
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

Role.hasMany(RolePermission, {
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
RolePermission.belongsTo(Role);

export { AuditLog, Role, Locality, District, Region, Country, UserAddress, UserContact, User, UserSearch, RolePermission, OutdatedName, RefreshToken };

