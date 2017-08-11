import Sequelize from 'sequelize';
import _ from 'lodash';
import Faker from 'faker';
import { postgresLogin } from './login-data';

const { name, address, finance, random, commerce, company, lorem, image, phone, internet } = Faker;

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
  firstName: {
    type: Sequelize.STRING,
    allowNull: false
  },
  middleName: {
    type: Sequelize.STRING,
    allowNull: false
  },
  lastName: {
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
  passwordHash: {
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
  userStatus: {
    type: Sequelize.ENUM('toverify', 'normal', 'banned', 'onlynews'),
    defaultValue: 'toverify'
  },
  birthdayDate: {
    type: Sequelize.DATEONLY
  },
  recoveryEmail: {
    type: Sequelize.STRING
  },
  handyNumber: {
    type: Sequelize.STRING
  },
  telefonNumber: {
    type: Sequelize.STRING
  },
  addressCountry: {
    type: Sequelize.STRING
  },
  addressState: {
    type: Sequelize.STRING
  },
  addressCity: {
    type: Sequelize.STRING
  },
  addressStreet: {
    type: Sequelize.STRING
  },
  addressNumber: {
    type: Sequelize.INTEGER
  },
  profilPicture: {
    type: Sequelize.STRING
  },
  lastactive: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.NOW
  },
  lastSecret: {
    type: Sequelize.STRING
  },
  riskValue: {
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
  resetOption: {
    type: Sequelize.INTEGER,
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

Conn.sync().then(() => {
  _.times(10, () => {
    return User.create({
      firstName: name.firstName(),
      middleName: name.firstName(),
      lastName: name.lastName(),
      position: name.jobTitle(),
      email: internet.email(),
      passwordHash: random.word()
    })
  });
});

export default Conn;
