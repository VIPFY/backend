export default (sequelize, { INTEGER, STRING }) => {
  const App = sequelize.define("app", {
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
    modaltype: {
      type: INTEGER
    }
  });

  App.associate = models => {
    App.belongsTo(models.Developer, { foreignKey: "developerid" });
  };

  return App;
};
