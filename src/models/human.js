export default (sequelize, { TEXT, STRING, DATE, TIME, INTEGER, ENUM }) => {
  const Human = sequelize.define("human_data", {
    firstname: { type: STRING, defaultValue: "not specified yet" },
    middlename: STRING,
    lastname: { type: STRING, defaultValue: "not specified yet" },
    title: STRING,
    sex: ENUM("m", "w", "u"),
    passwordhash: TEXT,
    birthday: DATE,
    lastactive: TIME,
    resetoption: INTEGER,
    language: TEXT
  });

  Human.associate = ({ Unit }) => Human.belongsTo(Unit, { foreignKey: "unitid" });

  Human.removeAttribute("id");

  return Human;
};
