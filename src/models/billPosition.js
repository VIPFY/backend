export default (sequelize, { TEXT, DECIMAL, CHAR }) => {
  const BillPosition = sequelize.define("billposition_data", {
    positiontext: TEXT,
    amount: { type: DECIMAL(10, 2), allowNull: false },
    currency: {
      type: CHAR(3),
      defaultValue: "USD"
    }
  });

  BillPosition.associate = ({ Bill, Plan, Unit }) => {
    BillPosition.belongsTo(Bill, { foreignKey: "billid" });
    BillPosition.belongsTo(Plan, { foreignKey: "planid" });
    BillPosition.belongsTo(Unit, { foreignKey: "vendor" });
  };

  return BillPosition;
};
