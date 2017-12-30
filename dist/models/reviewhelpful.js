"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (sequelize, _ref) {
  var DATE = _ref.DATE,
      NOW = _ref.NOW,
      BOOLEAN = _ref.BOOLEAN;

  var ReviewHelpful = sequelize.define("reviewhelpful", {
    helpfuldate: {
      type: DATE,
      defaultValue: NOW
    },
    balance: BOOLEAN
  }, {
    freezeTableName: true
  });

  ReviewHelpful.associate = function (models) {
    ReviewHelpful.belongsTo(models.User, { foreignKey: "userid" });
    ReviewHelpful.belongsTo(models.Review, { foreignKey: "reviewid" });
  };

  //Remove autogenerated primary key
  ReviewHelpful.removeAttribute("id");

  return ReviewHelpful;
};