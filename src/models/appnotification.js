export default (sequelize, { TEXT, INTEGER, DATE, NOW, BOOLEAN }) => {
  const AppNotification = sequelize.define("appnotification", {
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

  AppNotification.associate = models => {
    AppNotification.belongsTo(models.User, { foreignKey: "touser" });
    AppNotification.belongsTo(models.App, { foreignKey: "fromapp" });
  };

  return AppNotification;
};
