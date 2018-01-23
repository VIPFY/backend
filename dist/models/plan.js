"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (sequelize, _ref) {
  var STRING = _ref.STRING,
      INTEGER = _ref.INTEGER,
      DECIMAL = _ref.DECIMAL,
      DATEONLY = _ref.DATEONLY,
      SMALLINT = _ref.SMALLINT;

  var Plan = sequelize.define("plan", {
    description: STRING,
    renewalplan: INTEGER,
    period: INTEGER,
    numlicences: INTEGER,
    price: DECIMAL(11, 2),
    currency: {
      type: STRING(3),
      validate: {
        len: [1, 3]
      }
    },
    name: STRING,
    activefrom: DATEONLY,
    activeuntil: DATEONLY,
    promo: SMALLINT,
    promovipfy: DECIMAL(11, 2),
    promodeveloper: DECIMAL(11, 2),
    promoname: STRING,
    changeafter: SMALLINT,
    changeplan: INTEGER
  });

  Plan.associate = function (models) {
    Plan.belongsTo(models.App, { foreignKey: "appid" });
  };

  return Plan;
};