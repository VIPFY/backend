export default (sequelize, { STRING, DATE, INTEGER, TEXT, BOOLEAN, ENUM }) => {
  const User = sequelize.define("user_data", {
    firstname: { type: STRING, defaultValue: "not specified yet" },
    middlename: STRING,
    lastname: { type: STRING, defaultValue: "not specified yet" },
    title: STRING,
    sex: ENUM("m", "w", "u"),
    birthday: DATE,
    resetoption: INTEGER,
    language: TEXT,
    banned: { type: BOOLEAN, defaultValue: false },
    deleted: { type: BOOLEAN, defaultValue: false },
    suspended: { type: BOOLEAN, defaultValue: false },
    profilepicture: TEXT,
    riskvalue: INTEGER,
    position: TEXT,
    email: { type: TEXT, allowNull: false },
    verified: { type: BOOLEAN, defaultValue: false }
  });

  User.associate = ({ Unit }) => User.belongsTo(Unit, { foreignKey: "unitid" });

  return User;
};
