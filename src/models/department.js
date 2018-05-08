export default (sequelize, { STRING, JSONB, INTEGER, BOOLEAN }) => {
  const Department = sequelize.define("department_view", {
    name: STRING,
    legalinformation: JSONB,
    staticdata: JSONB,
    profilepicture: STRING,
    banned: BOOLEAN,
    deleted: BOOLEAN,
    suspended: BOOLEAN,
    employees: INTEGER
  });

  Department.associate = ({ Unit }) => {
    Department.belongsTo(Unit, { foreignKey: "unitid" });
  };

  Department.removeAttribute("id");

  return Department;
};
