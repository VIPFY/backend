export default (sequelize, { STRING, INTEGER }) => {
  const Department = sequelize.define("department", {
    departmentid: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
      unique: true
    },
    name: STRING,
    addresscountry: STRING,
    addressstate: STRING,
    addresscity: STRING,
    addressstreet: STRING,
    addressnumber: INTEGER
  });

  Department.associate = models => {
    Department.belongsTo(models.Company, { foreignKey: "companyid" });
  };
  return Department;
};
