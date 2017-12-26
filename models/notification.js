export default (sequelize, { TEXT, INTEGER, DATE, NOW, BOOLEAN }) => {
  const Notification = sequelize.define("notification", {
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

  Notification.associate = models => {
    Notification.belongsTo(models.User, { foreignKey: "touser" });
    Notification.belongsTo(models.User, { foreignKey: "fromuser" });
  };

  return Notification;
};
