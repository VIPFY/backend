export default (sequelize, { DATE, TEXT, INTEGER, BOOLEAN, ARRAY }) => {
  const MessageGroupMembership = sequelize.define("messagegroupmembership_data", {
    visibletimestart: DATE,
    visibletimeend: DATE,
    rights: {
      type: ARRAY(TEXT),
      set(val) {
        this.setDataValue("rights", val.toLowerCase());
      }
    },
    lastreadmessageid: INTEGER,
    archived: BOOLEAN
  });

  MessageGroupMembership.associate = ({ Unit, MessageGroup }) => {
    MessageGroupMembership.belongsTo(MessageGroup, { foreignKey: "groupid" });
    MessageGroupMembership.belongsTo(Unit, { foreignKey: "unitid" });
  };

  return MessageGroupMembership;
};
