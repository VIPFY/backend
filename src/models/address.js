export default (sequelize, { TEXT, CHAR, INTEGER }) => {
  const Address = sequelize.define("address_data", {
    country: CHAR(2),
    address: TEXT,
    description: TEXT,
    priority: INTEGER,
    tag: TEXT
  });

  Address.associate = ({ Unit }) => {
    Address.belongsTo(Unit, { foreignKey: "unitid" });
  };

  return Address;
};
