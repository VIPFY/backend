"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (sequelize, _ref) {
  var TEXT = _ref.TEXT,
      INTEGER = _ref.INTEGER,
      DATE = _ref.DATE,
      NOW = _ref.NOW,
      BOOLEAN = _ref.BOOLEAN;

  var Notification = sequelize.define("notification", {
    type: INTEGER,
    sendtime: {
      type: DATE,
      defaulValue: NOW
    },
    readtime: DATE,
    deleted: {
      type: BOOLEAN,
      defaultValue: false
    },
    senderdeleted: {
      type: BOOLEAN,
      defaultValue: false
    },
    message: {
      type: TEXT,
      allowNull: false
    }
  });

  Notification.associate = function (models) {
    Notification.belongsTo(models.User, { foreignKey: "touser" });
    Notification.belongsTo(models.User, { foreignKey: "fromuser" });
  };

  return Notification;
};