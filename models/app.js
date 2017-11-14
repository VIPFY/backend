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
      }
    },
    { timestamps: false }
  );

  App.associate = models => {
    App.belongsTo(models.Developer, { foreignKey: "developerid" });
  };

  return App;
};
