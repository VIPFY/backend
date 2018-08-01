export default (sequelize, { DATE, NOW, TEXT, BIGINT }) => {
  const MessageGroup = sequelize.define("messagegroup_data", {
    id: {
      type: BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    image: TEXT,
    name: TEXT,
    foundingdate: {
      type: DATE,
      defaultValue: NOW(),
      allowNull: false
    }
  });

  return MessageGroup;
};
