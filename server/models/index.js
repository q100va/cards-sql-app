import sequelize from '../database.js';
import Role from './role.js';
import Locality from './locality.js';
import District from './district.js';
import Region from './region.js';
import Country from './country.js';
import Address from './address.js';
import Contact from './contact.js';
import User from './user.js';
import Operation from './operation.js';
import SearchUser from './search-user.js';

/* User.belongsTo(Role);
Role.hasMany(User);
Role.hasMany(Operation);
Operation.belongsTo(Role); */

User.hasMany(Contact, {
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
Contact.belongsTo(User);

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

User.hasMany(Address, {
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
Address.belongsTo(User);
Address.belongsTo(Country);
Address.belongsTo(Region);
Address.belongsTo(District);
Address.belongsTo(Locality);
Country.hasMany(Address, {
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
Region.hasMany(Address, {
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
District.hasMany(Address, {
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
Locality.hasMany(Address, {
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

User.hasMany(SearchUser, {
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
SearchUser.belongsTo(User);

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

export { Role, Locality, District, Region, Country, Address, Contact, User, SearchUser, Operation };

