export default (sequelize, { DATE, NOW, TEXT }) => {
  const MessageGroup = sequelize.define("messagegroup_data", {
    image: TEXT,
    name: TEXT,
    foundingdate: {
      type: DATE,
      defaultValue: NOW()
    }
  });

  return MessageGroup;
};
