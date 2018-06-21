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

  Message.associate = ({ Unit }) => Message.belongsTo(Unit, { foreignKey: "receiver" });

  return Message;
};
