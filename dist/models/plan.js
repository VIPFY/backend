"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (sequelize, _ref) {
  var STRING = _ref.STRING,
      INTEGER = _ref.INTEGER;

  var Plan = sequelize.define("plan", {
    description: STRING,
    renewalplan: STRING,
    period: INTEGER,
    numlicences: INTEGER,
    price: STRING,
    currency: STRING,
    name: STRING
  });

  Plan.associate = function (models) {
    Plan.belongsTo(models.App, { foreignKey: "appid" });
  };

  return Plan;
};