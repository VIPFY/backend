export default (sequelize, { TEXT }) => {
  const MessageGroupRight = sequelize.define("messagegroupright_data", {
    right: TEXT
  });

  MessageGroupRight.associate = ({ Unit, MessageGroup }) => {
    MessageGroupRight.belongsTo(MessageGroup, { foreignKey: "groupid" });
    MessageGroupRight.belongsTo(Unit, { foreignKey: "unitid" });
  };

  return MessageGroupRight;
};
