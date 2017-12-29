"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (sequelize, _ref) {
  var INTEGER = _ref.INTEGER,
      STRING = _ref.STRING;

  var AppImage = sequelize.define("appimage", {
    link: {
      type: STRING,
      allowNull: false
    },
    sequence: {
      type: INTEGER
    }
  });

  AppImage.associate = function (models) {
    AppImage.belongsTo(models.App, { foreignKey: "appid" });
  };

  return AppImage;
};