export default (sequelize, { TEXT, BIGINT }) => {
  const MessageGroupRight = sequelize.define("messagegroupright_data", {
    right: TEXT,
    unitid: BIGINT,
    groupid: BIGINT
  });

  MessageGroupRight.associate = ({ Unit, MessageGroup }) => {
    MessageGroupRight.belongsTo(MessageGroup, { foreignKey: "groupid" });
    MessageGroupRight.belongsTo(Unit, { foreignKey: "unitid" });
  };

  return MessageGroupRight;
};
