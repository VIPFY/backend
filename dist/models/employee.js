"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (sequelize, _ref) {
  var STRING = _ref.STRING,
      DATE = _ref.DATE;

  var Employee = sequelize.define("employee", {
    begindate: DATE,
    enddate: DATE,
    position: STRING
  });

  Employee.associate = function (models) {
    Employee.belongsTo(models.Company, { foreignKey: "companyid" });
    Employee.belongsTo(models.Department, { foreignKey: "departmentid" });
    Employee.belongsTo(models.User, { foreignKey: "userid" });
  };

  //Remove the primary key which was autogenerated by sequelize
  Employee.removeAttribute("id");

  return Employee;
};