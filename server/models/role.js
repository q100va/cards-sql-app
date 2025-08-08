import { DataTypes } from "sequelize";
import sequelize from "../database.js";

// Define the "Role" model mapped to the "role" table in the database.
const Role = sequelize.define("role", {
  // Primary key "id": auto-incrementing integer.
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true
  },
  // "name" of the role: must be unique, not empty, and within 1 to 100 characters.
  name: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      notEmpty: true,       // Ensure the name is not an empty string.
      len: [1, 100]         // Enforce that the name is between 1 and 100 characters long.
    }
  },
  // "description" of the role: optional text with a maximum of 500 characters.
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,       // Ensure the description is not an empty string.
      len: [0, 500]         // Restrict description length to up to 500 characters.
    }
  }
});

// Export the Role model for use in other parts of the application.
export default Role;
