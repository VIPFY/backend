export default (sequelize, { STRING, BOOLEAN }) => {
  const Login = sequelize.define("login_view", {
    banned: BOOLEAN,
    suspended: BOOLEAN,
    deleted: BOOLEAN,
    verified: BOOLEAN,
    email: STRING,
    passwordhash: STRING
  });

  Login.associate = ({ Unit }) => Login.belongsTo(Unit, { foreignKey: "unitid" });

  Login.removeAttribute("id");

  return Login;
};
