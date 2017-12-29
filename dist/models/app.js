"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (sequelize, _ref) {
  var INTEGER = _ref.INTEGER,
      STRING = _ref.STRING;

  var App = sequelize.define("app", {
    name: {
      type: STRING,
      unique: true
    },
    applogo: {
      type: STRING
    },
    description: {
      type: STRING
    },
    modaltype: {
      type: INTEGER
    }
  });

  App.associate = function (models) {
    App.belongsTo(models.Developer, { foreignKey: "developerid" });
  };

  return App;
};