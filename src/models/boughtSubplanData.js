export default sequelize => {
  const BoughtSubplanData = sequelize.define("boughtsubplan_data");

  BoughtSubplanData.associate = ({ BoughtPlan, Plan }) => {
    BoughtSubplanData.belongsTo(BoughtPlan, { foreignKey: "boughtplanind" });
    BoughtSubplanData.belongsTo(Plan, { foreignKey: "subplanid" });
  };

  BoughtSubplanData.removeAttribute("id");

  return BoughtSubplanData;
};
