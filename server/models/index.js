import sequelize from '../database.js';
import AuditLogModel from './audit-log.js';
import RefreshToken from './refresh-token.js';
import RolePermissionModel from './role-permission.js';
import Role from './role.js';
import LocalityModel from './locality.js';
import DistrictModel from './district.js';
import RegionModel from './region.js';
import CountryModel from './country.js';
import User from './user.js';
import UserAddressModel from './user-address.js';
import UserContactModel from './user-contact.js';
import UserSearchModel from './user-search.js';
import UserOutdatedNameModel from './user-outdated-name.js';
import PartnerModel from './partner.js';
import PartnerAddressModel from './partner-address.js';
import PartnerContactModel from './partner-contact.js';
import PartnerSearchModel from './partner-search.js';
import PartnerOutdatedNameModel from './partner-outdated-name.js';


const AuditLog = AuditLogModel(sequelize);
const RolePermission = RolePermissionModel(sequelize);
const Country = CountryModel(sequelize);
const Region = RegionModel(sequelize);
const District = DistrictModel(sequelize);
const Locality = LocalityModel(sequelize);
const UserAddress = UserAddressModel(sequelize);
const UserContact = UserContactModel(sequelize);
const UserSearch = UserSearchModel(sequelize);
const UserOutdatedName = UserOutdatedNameModel(sequelize);
const Partner = PartnerModel(sequelize);
const PartnerAddress = PartnerAddressModel(sequelize);
const PartnerContact = PartnerContactModel(sequelize);
const PartnerSearch = PartnerSearchModel(sequelize);
const PartnerOutdatedName = PartnerOutdatedNameModel(sequelize);

User.hasMany(UserContact, { as: 'contacts' }, {
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
  hooks: true
});
UserContact.belongsTo(User);

Partner.hasMany(PartnerContact, { as: 'contacts' }, {
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
  hooks: true
});
PartnerContact.belongsTo(Partner);

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
  foreignKey: 'userId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
  hooks: true
});
Partner.hasMany(PartnerAddress, { as: 'addresses' }, {
  foreignKey: 'partnerId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
  hooks: true
});
UserAddress.belongsTo(User);
UserAddress.belongsTo(Country);
UserAddress.belongsTo(Region);
UserAddress.belongsTo(District);
UserAddress.belongsTo(Locality);

PartnerAddress.belongsTo(Partner);
PartnerAddress.belongsTo(Country);
PartnerAddress.belongsTo(Region);
PartnerAddress.belongsTo(District);
PartnerAddress.belongsTo(Locality);

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

Country.hasMany(PartnerAddress, {
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
Region.hasMany(PartnerAddress, {
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
District.hasMany(PartnerAddress, {
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
Locality.hasMany(PartnerAddress, {
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

User.hasMany(UserSearch, {
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
  hooks: true
});
UserSearch.belongsTo(User);

User.hasMany(UserOutdatedName, { as: 'outdatedNames' }, {
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
  hooks: true
});

UserOutdatedName.belongsTo(User);

Partner.hasMany(PartnerSearch, {
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
  hooks: true
});
PartnerSearch.belongsTo(Partner);

Partner.hasMany(PartnerOutdatedName, { as: 'outdatedNames' }, {
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
  hooks: true
});

PartnerOutdatedName.belongsTo(Partner);

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

export { AuditLog, Role, Locality, District, Region, Country, UserAddress, UserContact, User, UserSearch, RolePermission, UserOutdatedName, RefreshToken, Partner, PartnerAddress, PartnerContact, PartnerOutdatedName, PartnerSearch };

