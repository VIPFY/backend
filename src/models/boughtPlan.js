export default (sequelize, { TIME, JSONB, NOW, BOOLEAN }) => {
  const BoughtPlan = sequelize.define("boughtplan_data", {
    buytime: {
      type: TIME,
      defaultValue: NOW()
    },
    endtime: TIME,
    key: JSONB,
    disabled: { type: BOOLEAN, allowNull: false }
  });

  BoughtPlan.associate = ({ Unit, Plan }) => {
    BoughtPlan.belongsTo(Unit, { foreignKey: "buyer" });
    BoughtPlan.belongsTo(Unit, { foreignKey: "payer" });
    BoughtPlan.belongsTo(Plan, { foreignKey: "planid" });
    BoughtPlan.belongsTo(Plan, { foreignKey: "predecessor" });
  };

  return BoughtPlan;
};
