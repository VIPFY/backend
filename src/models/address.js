export default (sequelize, { TEXT, CHAR, JSONB, INTEGER, ARRAY }) => {
  const Address = sequelize.define("address_data", {
    country: { type: CHAR(2), allowNull: false },
    address: JSONB,
    description: TEXT,
    priority: INTEGER,
    tags: {
      type: ARRAY(TEXT),
      set(val) {
        this.setDataValue("tags", val.toLowerCase());
      }
    }
  });

  Address.associate = ({ Unit }) => {
    Address.belongsTo(Unit, { foreignKey: "unitid" });
  };

  return Address;
};
