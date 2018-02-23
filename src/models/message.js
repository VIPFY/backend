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

  Message.associate = ({ Human }) => {
    Message.belongsTo(Human, { foreignKey: "sender" });
    Message.belongsTo(Human, { foreignKey: "receiver" });
  };

  return Message;
};
