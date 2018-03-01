export default (sequelize, { STRING, TEXT, BOOLEAN }) => {
  const Login = sequelize.define("login_view", {
    firstname: { type: STRING, defaultValue: "not specified yet" },
    middlename: STRING,
    lastname: { type: STRING, defaultValue: "not specified yet" },
    banned: { type: BOOLEAN, defaultValue: false },
    deleted: { type: BOOLEAN, defaultValue: false },
    suspended: { type: BOOLEAN, defaultValue: false },
    profilepicture: TEXT,
    email: STRING,
    passwordhash: STRING
  });

  Login.associate = ({ Unit }) => Login.belongsTo(Unit, { foreignKey: "unitid" });

  return Login;
};
