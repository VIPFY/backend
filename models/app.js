export default (sequelize, { INTEGER, STRING }) => {
  const App = sequelize.define(
    "app",
    {
      id: {
        type: INTEGER,
        primaryKey: true,
        autoIncrement: true,
        unique: true
      },
      name: {
        type: STRING,
        unique: true
      },
      applogo: {
        type: STRING
      },
      description: {
        type: STRING
      },
      developerid: {
        type: INTEGER
      }
    },
    { timestamps: false }
  );

  return App;
};
