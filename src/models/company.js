export default (sequelize, { STRING, INTEGER, BOOLEAN }) => {
  const Company = sequelize.define("company", {
    name: STRING,
    companylogo: STRING,
    addresscountry: STRING,
    addressstate: STRING,
    addresscity: STRING,
    addressstreet: STRING,
    addressnumber: INTEGER,
    family: {
      type: BOOLEAN,
      defaultValue: false
    }
  });

  return Company;
};
