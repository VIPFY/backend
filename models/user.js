export default (sequelize, { STRING, BOOLEAN, INTEGER, ENUM, DATE }) => {
  const User = sequelize.define("user", {
    email: {
      type: STRING,
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    password: STRING,
    userstatus: {
      type: ENUM("toverify", "normal", "banned", "onlynews"),
      defaultValue: "toverify"
    },
    firstname: {
      type: STRING
    },
    middlename: {
      type: STRING
    },
    lastname: {
      type: STRING
    },
    title: STRING,
    sex: ENUM("m", "w", "t"),
    birthday: DATE,
    recoveryemail: STRING,
    mobilenumber: STRING,
    telefonnumber: STRING,
    addresscountry: STRING,
    addressstate: STRING,
    addresscity: STRING,
    addressstreet: STRING,
    addressnumber: STRING,
    profilepicture: STRING,
    // lastactive: DATE,
    lastsecret: STRING,
    riskvalue: INTEGER,
    newsletter: {
      type: BOOLEAN,
      defaultValue: false
    }
  });

  return User;
};
