import { DataTypes, Model } from 'sequelize';

export default function VolunteerInstituteModel(sequelize) {
  class VolunteerInstitute extends Model { }

  VolunteerInstitute.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },

      instituteName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },

      category: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },

      isRestricted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      isDeletable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'volunteer-institute',
      tableName: 'volunteer-institutes',
      underscored: false,
      timestamps: true,
      indexes: [
        {
          name: 'uq_volunteer_institutes_volunteer_name_category',
          unique: true,
          fields: [
            'volunteerId',
            'instituteName',
            'category',
          ],
        },
      ],
    },
  );

  return VolunteerInstitute;
}
