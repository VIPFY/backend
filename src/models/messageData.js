export default (sequelize, { DATE, NOW, TEXT, ARRAY }) => {
  const MessageData = sequelize.define("message_data", {
    sendtime: {
      type: DATE,
      defaultValue: NOW
    },
    readtime: DATE,
    archivetimesender: DATE,
    archivetimereceiver: DATE,
    tags: {
      type: ARRAY(TEXT),
      set(val) {
        this.setDataValue("tags", val.toLowerCase());
      }
    },
    messagetext: {
      type: TEXT,
      allowNull: false
    }
  });

  MessageData.associate = ({ User }) => {
    MessageData.belongsTo(User, { foreignKey: "receiver" });
    MessageData.belongsTo(User, { foreignKey: "sender" });
  };

  return MessageData;
};
