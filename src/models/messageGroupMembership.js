export default (sequelize, { DATE, INTEGER }) => {
  const MessageGroupMembership = sequelize.define("messagegroupmembership_data", {
    visibletimestart: DATE,
    visibletimeend: DATE,
    lastreadmessageid: INTEGER
  });

  MessageGroupMembership.associate = ({ Unit, MessageGroup }) => {
    MessageGroupMembership.belongsTo(MessageGroup, { foreignKey: "groupid" });
    MessageGroupMembership.belongsTo(Unit, { foreignKey: "unitid" });
  };

  return MessageGroupMembership;
};
