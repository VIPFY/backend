export default (sequelize, { TEXT, JSONB }) => {
  const Department = sequelize.define("department_data", {
    name: TEXT,
    legalinformation: JSONB,
    statisticdata: JSONB
  });

  Department.associate = ({ Unit }) => {
    Department.belongsTo(Unit, { foreignKey: "unitid" });
  };

  Department.removeAttribute("id");

  return Department;
};
