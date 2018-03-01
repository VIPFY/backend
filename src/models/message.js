export default (sequelize, { TEXT, ARRAY, DATE, STRING, NOW }) => {
  const Message = sequelize.define("message_view", {
    sendtime: {
      type: DATE,
      defaultValue: NOW
    },
    senderpicture: STRING,
    sendername: STRING,
    readtime: DATE,
    archivetimesender: DATE,
    archivetimereceiver: DATE,
    tag: ARRAY(TEXT),
    messagetext: {
      type: TEXT,
      allowNull: false
    }
  });

  Message.associate = ({ Unit }) => Message.belongsTo(Unit, { foreignKey: "receiver" });

  return Message;
};
