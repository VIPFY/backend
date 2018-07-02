export default (sequelize, { TEXT, CHAR, JSONB, INTEGER, ARRAY }) => {
  const Address = sequelize.define("address_data", {
    country: { type: CHAR(2), allowNull: false },
    address: JSONB,
    description: TEXT,
    priority: INTEGER,
    tags: {
      type: ARRAY(TEXT),
      set(values) {
        const normalizedValues = values.map(value => value.toLowerCase());
        this.setDataValue("tags", normalizedValues);
      }
    }
  });

  Address.associate = ({ Unit }) => {
    Address.belongsTo(Unit, { foreignKey: "unitid" });
  };

  return Address;
};
