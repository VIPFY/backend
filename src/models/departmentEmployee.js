export default sequelize => {
  const DepartmentEmployee = sequelize.define("department_employee_view", {});

  DepartmentEmployee.associate = ({ Unit, User }) => {
    DepartmentEmployee.belongsTo(Unit, { foreignKey: "id" });
    DepartmentEmployee.belongsTo(Unit, { foreignKey: "childid" });
    DepartmentEmployee.belongsTo(User, { foreignKey: "employee" });
  };

  DepartmentEmployee.removeAttribute("id");

  return DepartmentEmployee;
};
