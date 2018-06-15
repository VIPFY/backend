export default (sequelize, { TIME, JSONB, NOW, BOOLEAN, DECIMAL, INTEGER }) => {
  const BoughtPlan = sequelize.define("boughtplan_data", {
    buytime: {
      type: TIME,
      defaultValue: NOW()
    },
    endtime: TIME,
    key: JSONB,
    disabled: { type: BOOLEAN, allowNull: false },
    totalprice: DECIMAL(10, 2),
    amount: { type: INTEGER, defaultValue: 0 }
  });

  BoughtPlan.associate = ({ Unit, Plan }) => {
    BoughtPlan.belongsTo(Unit, { foreignKey: "buyer" });
    BoughtPlan.belongsTo(Unit, { foreignKey: "payer" });
    BoughtPlan.belongsTo(Plan, { foreignKey: "planid" });
    BoughtPlan.belongsTo(BoughtPlan, { foreignKey: "predecessor" });
    BoughtPlan.belongsTo(BoughtPlan, { foreignKey: "mainboughtplan" });
  };

  return BoughtPlan;
};
