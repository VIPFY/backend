export default (sequelize, { STRING, INTEGER }) => {
  const Company = sequelize.define("company", {
    name: STRING,
    companylogo: STRING,
    addresscountry: STRING,
    addressstate: STRING,
    addresscity: STRING,
    addressstreet: STRING,
    addressnumber: INTEGER
  });

  return Company;
};

//id |name|companylogo| addresscountry |
//addressstate  |addresscity|addressstreet  | addressnumber
