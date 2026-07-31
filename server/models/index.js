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
import HomeModel from './home.js';
import HomeAddressModel from './home-address.js';
import HomeContactModel from './home-contact.js';
import HomeOutdatedNameModel from './home-outdated-name.js';
import HomeSearchModel from './home-search.js';
import HomeCoordinationModel from './home-coordination.js';
import HomeUpdateDateModel from './home-update-date.js';
import SeniorModel from './senior.js';
import SeniorOutdatedNameModel from './senior-outdated-name.js';
import SeniorSearchModel from './senior-search.js';
import OccasionModel from './occasion.js';
import RecipientModel from './recipient.js';
import OrderModel from './order.js';
import OrderRecipientModel from './order-recipient.js'

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
const Home = HomeModel(sequelize);
const HomeAddress = HomeAddressModel(sequelize);
const HomeContact = HomeContactModel(sequelize);
const HomeOutdatedName = HomeOutdatedNameModel(sequelize);
const HomeSearch = HomeSearchModel(sequelize);
const HomeCoordination = HomeCoordinationModel(sequelize);
const HomeUpdateDate = HomeUpdateDateModel(sequelize);
const Senior = SeniorModel(sequelize);
const SeniorOutdatedName = SeniorOutdatedNameModel(sequelize);
const SeniorSearch = SeniorSearchModel(sequelize);
const Occasion = OccasionModel(sequelize);
const Recipient = RecipientModel(sequelize);
const Order = OrderModel(sequelize);
const OrderRecipient = OrderRecipientModel(sequelize);

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

Home.hasMany(HomeContact, {
  as: 'contacts',
  foreignKey: 'homeId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
HomeContact.belongsTo(Home, {
  foreignKey: 'homeId',
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
Home.hasMany(HomeAddress, {
  as: 'addresses',
  foreignKey: 'homeId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

Home.hasOne(HomeAddress, {               // ✅ одна актуальная
  as: 'activeAddress',
  foreignKey: 'homeId',
  scope: { isRestricted: false },        // ✅ фильтр прямо в ассоциации
  constraints: false,
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'                  // чтобы не ругался на множественные связи
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

HomeAddress.belongsTo(Home, {
  foreignKey: 'homeId',
});
HomeAddress.belongsTo(Country);
HomeAddress.belongsTo(Region);
HomeAddress.belongsTo(District);
HomeAddress.belongsTo(Locality);

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

Country.hasMany(HomeAddress, {
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
Region.hasMany(HomeAddress, {
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
District.hasMany(HomeAddress, {
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
Locality.hasMany(HomeAddress, {
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

Home.hasMany(HomeOutdatedName, {
  as: 'outdatedNames',
  foreignKey: 'homeId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

HomeOutdatedName.belongsTo(Home, {
  foreignKey: 'homeId',
});

Home.hasMany(HomeSearch, {
  foreignKey: 'homeId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
HomeSearch.belongsTo(Home, {
  foreignKey: 'homeId',
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

//institutes
Institute.belongsTo(Volunteer, {
  foreignKey: 'volunteerId',
});
Volunteer.hasMany(Institute, {
  as: 'institutes',
  foreignKey: 'volunteerId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

// coordinations
Home.hasMany(HomeCoordination, {
  as: 'coordinations',
  foreignKey: 'homeId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
Partner.hasMany(HomeCoordination, {
  as: 'coordinations',
  foreignKey: 'partnerId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

HomeCoordination.belongsTo(Partner, {
  as: 'partner',
  foreignKey: 'partnerId',
});
HomeCoordination.belongsTo(Home, {
  as: 'home',
  foreignKey: 'homeId',
});

//seniors
Home.hasMany(Senior, {
  as: 'seniors',
  foreignKey: 'homeId',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
Senior.belongsTo(Home, {
  as: 'home',
  foreignKey: 'homeId',
});

//update dates
Home.hasMany(HomeUpdateDate, {
  as: 'updateDates',
  foreignKey: 'homeId',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
HomeUpdateDate.belongsTo(Home, {
  as: 'home',
  foreignKey: 'homeId',
});

//seniors
Senior.hasMany(SeniorOutdatedName, {
  as: 'outdatedNames',
  foreignKey: 'seniorId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
SeniorOutdatedName.belongsTo(Senior, {
  foreignKey: 'seniorId',
});

Senior.belongsTo(Senior, { as: 'spouse', foreignKey: 'spouseId' });

Senior.hasMany(SeniorSearch, {
  foreignKey: 'seniorId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
SeniorSearch.belongsTo(Senior, {
  foreignKey: 'seniorId',
});

Occasion.hasMany(Recipient, {
  foreignKey: 'occasionId',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});
Recipient.belongsTo(Occasion, {
  foreignKey: 'occasionId',
});

Senior.hasMany(Recipient, {
  foreignKey: 'seniorId',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});
Recipient.belongsTo(Senior, {
  foreignKey: 'seniorId',
});

Order.belongsTo(Occasion, {
  foreignKey: 'occasionId',
  as: 'occasion',
});

Occasion.hasMany(Order, {
  foreignKey: 'occasionId',
  as: 'orders',
});

Order.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

User.hasMany(Order, {
  foreignKey: 'userId',
  as: 'orders',
});

Order.belongsTo(Volunteer, {
  foreignKey: 'volunteerId',
  as: 'volunteer',
});

Volunteer.hasMany(Order, {
  foreignKey: 'volunteerId',
  as: 'orders',
});

Order.belongsTo(Institute, {
  foreignKey: 'instituteId',
  as: 'institute',
});

Institute.hasMany(Order, {
  foreignKey: 'instituteId',
  as: 'orders',
});

Order.belongsTo(VolunteerContact, {
  foreignKey: 'contactId',
  as: 'contact',
});

VolunteerContact.hasMany(Order, {
  foreignKey: 'contactId',
  as: 'orders',
});

Order.hasMany(OrderRecipient, {
  foreignKey: 'orderId',
  as: 'orderRecipients',
});

Recipient.hasMany(OrderRecipient, {
  foreignKey: 'recipientId',
  as: 'orderRecipients',
});

Senior.hasMany(OrderRecipient, {
  foreignKey: 'seniorId',
  as: 'orderRecipients',
});

Home.hasMany(OrderRecipient, {
  foreignKey: 'homeId',
  as: 'orderRecipients',
});

OrderRecipient.belongsTo(Order, {
  foreignKey: 'orderId',
  as: 'order',
});

OrderRecipient.belongsTo(Recipient, {
  foreignKey: 'recipientId',
  as: 'recipient',
});

OrderRecipient.belongsTo(Senior, {
  foreignKey: 'seniorId',
  as: 'senior',
});

OrderRecipient.belongsTo(Home, {
  foreignKey: 'homeId',
  as: 'home',
});



export {
  AuditLog, RefreshToken,
  Locality, District, Region, Country,
  Role, UserAddress, UserContact, User, UserSearch, RolePermission, UserOutdatedName,
  Partner, PartnerAddress, PartnerContact, PartnerOutdatedName, PartnerSearch,
  VolunteerAddress, Volunteer, VolunteerContact, VolunteerSearch, VolunteerOutdatedName,
  VolunteerSubscription, VolunteerCooperation, Institute,
  Home, HomeAddress, HomeContact, HomeOutdatedName, HomeSearch, HomeCoordination, HomeUpdateDate,
  Senior, SeniorOutdatedName, SeniorSearch,
  Occasion, Recipient, Order, OrderRecipient
};

