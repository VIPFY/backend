export default (sequelize, { TEXT, CHAR, JSONB, INTEGER }) => {
  const Address = sequelize.define("address_data", {
    country: { type: CHAR(2), allowNull: false },
    address: JSONB,
    description: TEXT,
    priority: INTEGER,
    tag: {
      type: TEXT,
      set(val) {
        this.setDataValue("tag", val.toLowerCase());
      }
    }
  });

  Address.associate = ({ Unit }) => {
    Address.belongsTo(Unit, { foreignKey: "unitid" });
  };

  return Address;
};
