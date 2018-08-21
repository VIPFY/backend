export default (sequelize, { DATE, TEXT, BOOLEAN }) => {
  const MessageTag = sequelize.define("messagetag_data", {
    createdat: DATE,
    tag: TEXT,
    public: BOOLEAN
  });

  MessageTag.associate = ({ Unit, Message }) => {
    MessageTag.belongsTo(Unit, { foreignKey: "unitid" });
    MessageTag.belongsTo(Message, { foreignKey: "messageid" });
  };

  return MessageTag;
};
