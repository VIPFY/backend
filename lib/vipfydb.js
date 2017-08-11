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
  firstName: {
    type: _sequelize2.default.STRING,
    allowNull: false
  },
  middleName: {
    type: _sequelize2.default.STRING,
    allowNull: false
  },
  lastName: {
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
  passwordHash: {
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
  userStatus: {
    type: _sequelize2.default.ENUM('toverify', 'normal', 'banned', 'onlynews'),
    defaultValue: 'toverify'
  },
  birthdayDate: {
    type: _sequelize2.default.DATEONLY
  },
  recoveryEmail: {
    type: _sequelize2.default.STRING
  },
  handyNumber: {
    type: _sequelize2.default.STRING
  },
  telefonNumber: {
    type: _sequelize2.default.STRING
  },
  addressCountry: {
    type: _sequelize2.default.STRING
  },
  addressState: {
    type: _sequelize2.default.STRING
  },
  addressCity: {
    type: _sequelize2.default.STRING
  },
  addressStreet: {
    type: _sequelize2.default.STRING
  },
  addressNumber: {
    type: _sequelize2.default.INTEGER
  },
  profilPicture: {
    type: _sequelize2.default.STRING
  },
  lastactive: {
    type: _sequelize2.default.DATE,
    defaultValue: _sequelize2.default.NOW
  },
  lastSecret: {
    type: _sequelize2.default.STRING
  },
  riskValue: {
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
  resetOption: {
    type: _sequelize2.default.INTEGER,
    defaultValue: 0
  }
});

// const Company = define('companies', {
//   id: {
//     type: Sequelize.INTEGER,
//     primaryKey: true,
//     autoIncrement: true
//   },
//   name: {
//     type: Sequelize.STRING,
//     allowNull: false
//   },
//   companyLogo: {
//     type: Sequelize.STRING
//   },
//   addressCountry: {
//     type: Sequelize.STRING
//   },
//   addressState: {
//     type: Sequelize.STRING
//   },
//   addressCity: {
//     type: Sequelize.STRING
//   },
//   addressStreet: {
//     type: Sequelize.STRING
//   },
//   addressnumber: {
//     type: Sequelize.INT
//   }
// });
//
// // Relationships
// Company.hasMany(Users);
// User.belongsTo(Company);

Conn.sync().then(function () {
  _lodash2.default.times(10, function () {
    return User.create({
      firstName: name.firstName(),
      middleName: name.firstName(),
      lastName: name.lastName(),
      position: name.jobTitle(),
      email: internet.email(),
      passwordHash: random.word()
    });
  });
});

exports.default = Conn;
//# sourceMappingURL=vipfydb.js.map