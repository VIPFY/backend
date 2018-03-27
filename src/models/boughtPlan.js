export default (sequelize, { TIME, JSONB, NOW }) => {
  const BoughtPlan = sequelize.define("boughtplan_data", {
    buytime: {
      type: TIME,
      defaultValue: NOW
    },
    endtime: TIME,
    key: JSONB
  });

  BoughtPlan.associate = ({ Unit, Plan }) => {
    BoughtPlan.belongsTo(Unit, { foreignKey: "buyer" });
    BoughtPlan.belongsTo(Unit, { foreignKey: "buyfor" });
    BoughtPlan.belongsTo(Plan, { foreignKey: "planid" });
  };

  return BoughtPlan;
};
