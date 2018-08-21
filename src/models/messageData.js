export default (sequelize, { DATE, NOW, TEXT, JSONB, BIGINT }) => {
  const MessageData = sequelize.define("message_data", {
    sendtime: {
      type: DATE,
      defaultValue: NOW()
    },
    messagetext: {
      type: TEXT,
      allowNull: false
    },
    payload: JSONB,
    deletedat: DATE,
    modifiedat: DATE,
    receiver: BIGINT,
    sender: BIGINT
  });

  MessageData.associate = ({ Unit, MessageGroup }) => {
    MessageData.belongsTo(MessageGroup, { foreignKey: "receiver" });
    MessageData.belongsTo(Unit, { foreignKey: "sender" });
  };

  return MessageData;
};
