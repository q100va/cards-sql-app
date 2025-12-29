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
import VolunteerModel from './volunteer.js';
import VolunteerAddressModel from './volunteer-address.js';
import VolunteerContactModel from './volunteer-contact.js';
import VolunteerSearchModel from './volunteer-search.js';
import VolunteerOutdatedNameModel from './volunteer-outdated-name.js';
import VolunteerSubscriptionModel from './volunteer-subscription.js';
import VolunteerCooperationModel from './volunteer-cooperation.js';
import InstituteModel from './institute.js';

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
const Volunteer = VolunteerModel(sequelize);
const VolunteerAddress = VolunteerAddressModel(sequelize);
const VolunteerContact = VolunteerContactModel(sequelize);
const VolunteerSearch = VolunteerSearchModel(sequelize);
const VolunteerOutdatedName = VolunteerOutdatedNameModel(sequelize);
const VolunteerSubscription = VolunteerSubscriptionModel(sequelize);
const VolunteerCooperation = VolunteerCooperationModel(sequelize);
const Institute = InstituteModel(sequelize);

User.hasMany(UserContact, {
  as: 'contacts',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
UserContact.belongsTo(User);

Partner.hasMany(PartnerContact, {
  as: 'contacts',
  foreignKey: 'partnerId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
PartnerContact.belongsTo(Partner, {
  foreignKey: 'partnerId',
});

Volunteer.hasMany(VolunteerContact, {
  as: 'contacts',
  foreignKey: 'volunteerId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
VolunteerContact.belongsTo(Volunteer, {
  foreignKey: 'volunteerId',
});

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

User.hasMany(UserAddress, {
  as: 'addresses',
  foreignKey: 'userId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
Partner.hasMany(PartnerAddress, {
  as: 'addresses',
  foreignKey: 'partnerId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
Volunteer.hasMany(VolunteerAddress, {
  as: 'addresses',
  foreignKey: 'volunteerId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
UserAddress.belongsTo(User);
UserAddress.belongsTo(Country);
UserAddress.belongsTo(Region);
UserAddress.belongsTo(District);
UserAddress.belongsTo(Locality);

PartnerAddress.belongsTo(Partner, {
  foreignKey: 'partnerId',
});
PartnerAddress.belongsTo(Country);
PartnerAddress.belongsTo(Region);
PartnerAddress.belongsTo(District);
PartnerAddress.belongsTo(Locality);

VolunteerAddress.belongsTo(Volunteer, {
  foreignKey: 'volunteerId',
});
VolunteerAddress.belongsTo(Country);
VolunteerAddress.belongsTo(Region);
VolunteerAddress.belongsTo(District);
VolunteerAddress.belongsTo(Locality);

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

Country.hasMany(VolunteerAddress, {
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
Region.hasMany(VolunteerAddress, {
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
District.hasMany(VolunteerAddress, {
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
Locality.hasMany(VolunteerAddress, {
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

User.hasMany(UserSearch, {
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
UserSearch.belongsTo(User);

User.hasMany(UserOutdatedName, {
  as: 'outdatedNames',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

UserOutdatedName.belongsTo(User);

Partner.hasMany(PartnerSearch, {
  foreignKey: 'partnerId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
PartnerSearch.belongsTo(Partner, {
  foreignKey: 'partnerId',
});

Partner.hasMany(PartnerOutdatedName, {
  as: 'outdatedNames',
  foreignKey: 'partnerId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

PartnerOutdatedName.belongsTo(Partner, {
  foreignKey: 'partnerId',
});

Volunteer.hasMany(VolunteerSearch, {
  foreignKey: 'volunteerId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
VolunteerSearch.belongsTo(Volunteer, {
  foreignKey: 'volunteerId',
});

Volunteer.hasMany(VolunteerOutdatedName, {
  as: 'outdatedNames',
  foreignKey: 'volunteerId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

VolunteerOutdatedName.belongsTo(Volunteer, {
  foreignKey: 'volunteerId',
});

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

// subscriptions
Volunteer.hasMany(VolunteerSubscription, {
  as: 'subscriptions',
  foreignKey: 'volunteerId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
User.hasMany(VolunteerSubscription, {
  as: 'volunteerSubscriptions',
  foreignKey: 'userId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

VolunteerSubscription.belongsTo(Volunteer, {
  as: 'volunteer',
  foreignKey: 'volunteerId',
});
VolunteerSubscription.belongsTo(User, {
  as: 'user',
  foreignKey: 'userId',
});


// cooperations
Volunteer.hasMany(VolunteerCooperation, {
  as: 'cooperations',
  foreignKey: 'volunteerId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
User.hasMany(VolunteerCooperation, {
  as: 'volunteerCooperations',
  foreignKey: 'userId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

VolunteerCooperation.belongsTo(Volunteer, {
  as: 'volunteer',
  foreignKey: 'volunteerId',
});
VolunteerCooperation.belongsTo(User, {
  as: 'user',
  foreignKey: 'userId',
});

Institute.belongsTo(Volunteer, {
  foreignKey: 'volunteerId',
});
Volunteer.hasMany(Institute, {
  as: 'institutes',
  foreignKey: 'volunteerId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});


export {
  AuditLog, RefreshToken,
  Locality, District, Region, Country,
  Role, UserAddress, UserContact, User, UserSearch, RolePermission, UserOutdatedName,
  Partner, PartnerAddress, PartnerContact, PartnerOutdatedName, PartnerSearch,
  VolunteerAddress, Volunteer, VolunteerContact, VolunteerSearch, VolunteerOutdatedName,
  VolunteerSubscription, VolunteerCooperation, Institute
};

