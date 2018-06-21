export default (sequelize, { TEXT, STRING, DATEONLY, TIME, INTEGER, ENUM }) => {
  const Human = sequelize.define("human_data", {
    firstname: { type: STRING, defaultValue: "John" },
    middlename: STRING,
    lastname: STRING,
    title: STRING,
    sex: ENUM("m", "w", "u"),
    passwordhash: TEXT,
    birthday: DATEONLY,
    lastactive: TIME,
    resetoption: INTEGER,
    language: TEXT
  });

  Human.associate = ({ Unit }) => Human.belongsTo(Unit, { foreignKey: "unitid" });

  Human.removeAttribute("id");

  return Human;
};
