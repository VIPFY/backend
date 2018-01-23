"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (sequelize, _ref) {
  var TEXT = _ref.TEXT,
      SMALLINT = _ref.SMALLINT,
      DATE = _ref.DATE,
      NOW = _ref.NOW;

  var Review = sequelize.define("review", {
    reviewdate: {
      type: DATE,
      defaultValue: NOW
    },
    stars: {
      type: SMALLINT,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 5
      }
    },
    reviewtext: TEXT
  });

  Review.associate = function (models) {
    Review.belongsTo(models.User, { foreignKey: "userid" });
    Review.belongsTo(models.App, { foreignKey: "appid" });
    Review.belongsTo(models.Review, { foreignKey: "answerto" });
  };

  return Review;
};