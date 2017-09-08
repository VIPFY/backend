import Sequelize from 'sequelize';
import _ from 'lodash';
import Faker from 'faker';
import { postgresLogin } from './login-data';

const { name, address, date, finance, random, commerce, company, lorem, image,
  phone, internet } = Faker;

const Conn = new Sequelize(
  'postgres', //Name of the database
  'postgres', //Username
  postgresLogin, //Password
  {
    dialect: 'postgres', //Which database is used
    host: 'localhost', //The host used
    port: '5432'
  }
);

const User = Conn.define('user', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  firstname: {
    type: Sequelize.STRING,
    allowNull: false
  },
  middlename: {
    type: Sequelize.STRING,
    allowNull: false
  },
  lastname: {
    type: Sequelize.STRING,
    allowNull: false
  },
  position: {
    type: Sequelize.STRING,
  },
  email: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    },
    unique: true
  },
  passwordhash: {
    type: Sequelize.STRING,
    allowNull: false
  },
  title: {
    type: Sequelize.STRING,
    allowNull: true
  },
  sex: {
    type: Sequelize.CHAR(1)
  },
  userstatus: {
    type: Sequelize.ENUM('toverify', 'normal', 'banned', 'onlynews'),
    defaultValue: 'toverify'
  },
  birthdaydate: {
    type: Sequelize.DATEONLY
  },
  recoveryemail: {
    type: Sequelize.STRING
  },
  handynumber: {
    type: Sequelize.STRING
  },
  telefonnumber: {
    type: Sequelize.STRING
  },
  addresscountry: {
    type: Sequelize.STRING
  },
  addressstate: {
    type: Sequelize.STRING
  },
  addresscity: {
    type: Sequelize.STRING
  },
  addressstreet: {
    type: Sequelize.STRING
  },
  addressnumber: {
    type: Sequelize.INTEGER
  },
  profilpicture: {
    type: Sequelize.STRING
  },
  lastactive: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.NOW
  },
  lastsecret: {
    type: Sequelize.STRING
  },
  riskvalue: {
    type: Sequelize.INTEGER
  },
  newsletter: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  },
  referall: {
    type: Sequelize.INTEGER,
    defaultValue: 0
  },
  coBranded: {
    type: Sequelize.INTEGER,
    defaultValue: 0
  },
  resetoption: {
    type: Sequelize.INTEGER,
    defaultValue: 0
  }
});

const Company = Conn.define('company', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  companylogo: {
    type: Sequelize.STRING
  },
  addresscountry: {
    type: Sequelize.STRING
  },
  addressstate: {
    type: Sequelize.STRING
  },
  addresscity: {
    type: Sequelize.STRING
  },
  addressstreet: {
    type: Sequelize.STRING
  },
  addressnumber: {
    type: Sequelize.INTEGER
  }
}, {
  timestamps: false
});

const Department = Conn.define('department', {
  departmentid: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    unique: true,
    primaryKey: true
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  addresscountry: {
    type: Sequelize.STRING
  },
  addressstate: {
    type: Sequelize.STRING
  },
  addresscity: {
    type: Sequelize.STRING
  },
  addressstreet: {
    type: Sequelize.STRING
  },
  addressnumber: {
    type: Sequelize.INTEGER
  },
  companyid: {
    type: Sequelize.INTEGER
  }
}, {
  timestamps: false
});

const Developer = Conn.define("developer", {
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  website: {
    type: Sequelize.STRING
  },
  legalwebsite: {
    type: Sequelize.STRING
  },
  bankaccount: {
    type: Sequelize.STRING
  }
}, {
  timestamps: false
});

const Review = Conn.define('review', {
  userid: {
    type: Sequelize.INTEGER
  },
  appid: {
    type: Sequelize.INTEGER
  },
  reviewdate: {
    type: Sequelize.DATE
  },
  stars: {
    type: Sequelize.INTEGER
  },
  reviewtext: {
    type: Sequelize.TEXT,
    primaryKey: true
  }
}, {
  timestamps: false
});
// // Relationships
// Company.hasMany(Department);
//
// Department.belongsTo(Company);
// User.belongsTo(Company);

Conn.sync().then(() => {
  let id = 0;
  _.times(40, () => {
    id++;
    return User.update(
      { firstname: name.firstName() },
      { middlename: name.firstName() },
      { lastname: name.lastName() },
       { position: name.jobTitle() },
       { email: internet.email() },
       { passwordhash: random.word() },
       { profilpicture: image.avatar() },
       { sex: _.random("male", "female") },
       { birthdaydate: date.past() },
       { recoveryemail: internet.email() },
       { handynumber: phone.phoneNumber() },
       { where: { id } }
    ).then(() => console.log("Success"));
  });
  // _.times(10, () => {
  //   return Company.create({
  //     name: company.companyName(),
  //     companylogo: image.business(),
  //     addresscountry: address.country(),
  //     addressstate: address.state(),
  //     addresscity: address.city(),
  //     addressstreet: address.streetName(),
  //     addressnumber: _.random(1, 9)
  //   });
  // });
  // _.times(10, () => {
  //   return Department.create({
  //     name: commerce.department(),
  //     addresscountry: address.country(),
  //     addressstate: address.state(),
  //     addresscity: address.city(),
  //     addressstreet: address.streetName(),
  //     addressnumber: _.random(1, 9),
  //     companyid: _.random(1, 10)
  //   });
  // });
  // _.times(10, () => {
  //   return Developer.create({
  //     name: company.companyName(),
  //     website: internet.domainName(),
  //     legalwebsite: internet.domainName(),
  //     bankaccount: finance.account()
  //   });
  // });
  // _.times(10, () => {
  //   return Review.create({
  //     userid: _.random(1, 15),
  //     appid: _.random(1, 10),
  //     reviewdate: date.past(),
  //     stars: _.random(1, 5),
  //     reviewtext: lorem.text()
  //   });
  // });
});

export default Conn;
