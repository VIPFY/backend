export default (sequelize, { STRING, INTEGER }) => {
  const Company = sequelize.define("company", {
    id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
      unique: true
    },
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
