export default (sequelize, { DATE, NOW, TEXT, ARRAY }) => {
  const MessageData = sequelize.define("message_data", {
    sendtime: {
      type: DATE,
      defaultValue: NOW
    },
    readtime: DATE,
    archivetimesender: DATE,
    archivetimereceiver: DATE,
    tag: ARRAY(TEXT),
    messagetext: {
      type: TEXT,
      allowNull: false
    }
  });

  MessageData.associate = ({ Unit }) => {
    MessageData.belongsTo(Unit, { foreignKey: "receiver" });
    MessageData.belongsTo(Unit, { foreignKey: "sender" });
  };

  return MessageData;
};
