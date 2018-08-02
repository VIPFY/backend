export default (sequelize, { DATE, BIGINT }) => {
  const MessageGroupMembership = sequelize.define("messagegroupmembership_data", {
    visibletimestart: DATE,
    visibletimeend: DATE,
    lastreadmessageid: BIGINT
  });

  MessageGroupMembership.associate = ({ Unit, MessageGroup }) => {
    MessageGroupMembership.belongsTo(MessageGroup, { foreignKey: "groupid" });
    MessageGroupMembership.belongsTo(Unit, { foreignKey: "unitid" });
  };

  return MessageGroupMembership;
};
