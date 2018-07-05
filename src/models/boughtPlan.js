export default (sequelize, { TIME, JSONB, NOW, BOOLEAN, DECIMAL, INTEGER, TEXT }) => {
  const BoughtPlan = sequelize.define("boughtplan_data", {
    buytime: {
      type: TIME,
      defaultValue: NOW()
    },
    endtime: TIME,
    key: JSONB,
    disabled: { type: BOOLEAN, allowNull: false },
    totalprice: DECIMAL(10, 2),
    amount: { type: INTEGER, defaultValue: 0 },
    description: TEXT
  });

  BoughtPlan.associate = ({ Unit, Plan }) => {
    BoughtPlan.belongsTo(Unit, { foreignKey: "buyer" });
    BoughtPlan.belongsTo(Unit, { foreignKey: "payer" });
    BoughtPlan.belongsTo(Unit, { foreignKey: "usedby" });
    BoughtPlan.belongsTo(Plan, { foreignKey: "planid" });
    BoughtPlan.belongsTo(BoughtPlan, { foreignKey: "predecessor" });
    BoughtPlan.belongsTo(BoughtPlan, { foreignKey: "mainboughtplan" });
  };

  return BoughtPlan;
};
