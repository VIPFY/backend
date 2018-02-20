export default (sequelize, { TEXT, ARRAY, DATE, NOW }) => {
  const Message = sequelize.define("message_data", {
    sendtime: {
      type: DATE,
      defaulValue: NOW
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

  Message.associate = ({ Unit }) => {
    Message.belongsTo(Unit, { foreignKey: "sender" });
    Message.belongsTo(Unit, { foreignKey: "receiver" });
  };

  return Message;
};
