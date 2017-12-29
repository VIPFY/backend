"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (sequelize, _ref) {
  var STRING = _ref.STRING,
      INTEGER = _ref.INTEGER;

  var Department = sequelize.define("department", {
    departmentid: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
      unique: true
    },
    name: STRING,
    addresscountry: STRING,
    addressstate: STRING,
    addresscity: STRING,
    addressstreet: STRING,
    addressnumber: INTEGER
  });

  Department.associate = function (models) {
    Department.belongsTo(models.Company, { foreignKey: "companyid" });
  };
  return Department;
};