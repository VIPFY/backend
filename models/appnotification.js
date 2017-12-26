export default (sequelize, { TEXT, INTEGER, DATE, NOW, BOOLEAN }) => {
  const AppNotification = sequelize.define("appnotification", {
    type: INTEGER,
    sendtime: {
      type: DATE,
      allowNull: false,
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
    message: TEXT
  });

  AppNotification.associate = models => {
    AppNotification.belongsTo(models.User, { foreignKey: "touser" });
    AppNotification.belongsTo(models.App, { foreignKey: "fromapp" });
  };

  return AppNotification;
};
