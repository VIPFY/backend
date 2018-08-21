export default sequelize => {
  const DepartmentApp = sequelize.define("departmentapps_data", {});

  DepartmentApp.associate = ({ Unit, BoughtPlan }) => {
    DepartmentApp.belongsTo(Unit, { foreignKey: "departmentid" });
    DepartmentApp.belongsTo(BoughtPlan, { foreignKey: "boughtplanid" });
  };

  DepartmentApp.removeAttribute("id");

  return DepartmentApp;
};
