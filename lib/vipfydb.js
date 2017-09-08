'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _sequelize = require('sequelize');

var _sequelize2 = _interopRequireDefault(_sequelize);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _faker = require('faker');

var _faker2 = _interopRequireDefault(_faker);

var _loginData = require('./login-data');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var name = _faker2.default.name,
    address = _faker2.default.address,
    date = _faker2.default.date,
    finance = _faker2.default.finance,
    random = _faker2.default.random,
    commerce = _faker2.default.commerce,
    company = _faker2.default.company,
    lorem = _faker2.default.lorem,
    image = _faker2.default.image,
    phone = _faker2.default.phone,
    internet = _faker2.default.internet;


var Conn = new _sequelize2.default('postgres', //Name of the database
'postgres', //Username
_loginData.postgresLogin, //Password
{
  dialect: 'postgres', //Which database is used
  host: 'localhost', //The host used
  port: '5432'
});

var User = Conn.define('user', {
  id: {
    type: _sequelize2.default.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  firstname: {
    type: _sequelize2.default.STRING,
    allowNull: false
  },
  middlename: {
    type: _sequelize2.default.STRING,
    allowNull: false
  },
  lastname: {
    type: _sequelize2.default.STRING,
    allowNull: false
  },
  position: {
    type: _sequelize2.default.STRING
  },
  email: {
    type: _sequelize2.default.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    },
    unique: true
  },
  passwordhash: {
    type: _sequelize2.default.STRING,
    allowNull: false
  },
  title: {
    type: _sequelize2.default.STRING,
    allowNull: true
  },
  sex: {
    type: _sequelize2.default.CHAR(1)
  },
  userstatus: {
    type: _sequelize2.default.ENUM('toverify', 'normal', 'banned', 'onlynews'),
    defaultValue: 'toverify'
  },
  birthdaydate: {
    type: _sequelize2.default.DATEONLY
  },
  recoveryemail: {
    type: _sequelize2.default.STRING
  },
  handynumber: {
    type: _sequelize2.default.STRING
  },
  telefonnumber: {
    type: _sequelize2.default.STRING
  },
  addresscountry: {
    type: _sequelize2.default.STRING
  },
  addressstate: {
    type: _sequelize2.default.STRING
  },
  addresscity: {
    type: _sequelize2.default.STRING
  },
  addressstreet: {
    type: _sequelize2.default.STRING
  },
  addressnumber: {
    type: _sequelize2.default.INTEGER
  },
  profilpicture: {
    type: _sequelize2.default.STRING
  },
  lastactive: {
    type: _sequelize2.default.DATE,
    defaultValue: _sequelize2.default.NOW
  },
  lastsecret: {
    type: _sequelize2.default.STRING
  },
  riskvalue: {
    type: _sequelize2.default.INTEGER
  },
  newsletter: {
    type: _sequelize2.default.BOOLEAN,
    defaultValue: false
  },
  referall: {
    type: _sequelize2.default.INTEGER,
    defaultValue: 0
  },
  coBranded: {
    type: _sequelize2.default.INTEGER,
    defaultValue: 0
  },
  resetoption: {
    type: _sequelize2.default.INTEGER,
    defaultValue: 0
  }
});

var Company = Conn.define('company', {
  id: {
    type: _sequelize2.default.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: _sequelize2.default.STRING,
    allowNull: false
  },
  companylogo: {
    type: _sequelize2.default.STRING
  },
  addresscountry: {
    type: _sequelize2.default.STRING
  },
  addressstate: {
    type: _sequelize2.default.STRING
  },
  addresscity: {
    type: _sequelize2.default.STRING
  },
  addressstreet: {
    type: _sequelize2.default.STRING
  },
  addressnumber: {
    type: _sequelize2.default.INTEGER
  }
}, {
  timestamps: false
});

var Department = Conn.define('department', {
  departmentid: {
    type: _sequelize2.default.INTEGER,
    autoIncrement: true,
    unique: true,
    primaryKey: true
  },
  name: {
    type: _sequelize2.default.STRING,
    allowNull: false
  },
  addresscountry: {
    type: _sequelize2.default.STRING
  },
  addressstate: {
    type: _sequelize2.default.STRING
  },
  addresscity: {
    type: _sequelize2.default.STRING
  },
  addressstreet: {
    type: _sequelize2.default.STRING
  },
  addressnumber: {
    type: _sequelize2.default.INTEGER
  },
  companyid: {
    type: _sequelize2.default.INTEGER
  }
}, {
  timestamps: false
});

var Developer = Conn.define("developer", {
  name: {
    type: _sequelize2.default.STRING,
    allowNull: false
  },
  website: {
    type: _sequelize2.default.STRING
  },
  legalwebsite: {
    type: _sequelize2.default.STRING
  },
  bankaccount: {
    type: _sequelize2.default.STRING
  }
}, {
  timestamps: false
});

var Review = Conn.define('review', {
  userid: {
    type: _sequelize2.default.INTEGER
  },
  appid: {
    type: _sequelize2.default.INTEGER
  },
  reviewdate: {
    type: _sequelize2.default.DATE
  },
  stars: {
    type: _sequelize2.default.INTEGER
  },
  reviewtext: {
    type: _sequelize2.default.TEXT,
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

Conn.sync().then(function () {
  var id = 0;
  _lodash2.default.times(40, function () {
    id++;
    return User.update({ firstname: name.firstName() }, { middlename: name.firstName() }, { lastname: name.lastName() }, { position: name.jobTitle() }, { email: internet.email() }, { passwordhash: random.word() }, { profilpicture: image.avatar() }, { sex: _lodash2.default.random("male", "female") }, { birthdaydate: date.past() }, { recoveryemail: internet.email() }, { handynumber: phone.phoneNumber() }, { where: { id: id } }).then(function () {
      return console.log("Success");
    });
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

exports.default = Conn;
//# sourceMappingURL=vipfydb.js.map