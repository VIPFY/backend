"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (sequelize, _ref) {
  var SMALLINT = _ref.SMALLINT,
      STRING = _ref.STRING,
      TEXT = _ref.TEXT,
      DATE = _ref.DATE;

  var App = sequelize.define("app", {
    name: {
      type: STRING,
      unique: true
    },
    percentage: SMALLINT,
    applogo: {
      type: STRING
    },
    description: TEXT,
    modaltype: {
      type: SMALLINT,
      defaultValue: 0
    },
    updatedate: DATE,
    versionnumber: STRING,
    teaserdescription: TEXT,
    ownpage: STRING,
    supportwebsite: STRING,
    supportphone: STRING
  });

  App.associate = function (models) {
    App.belongsTo(models.Developer, { foreignKey: "developerid" });
  };

  return App;
};