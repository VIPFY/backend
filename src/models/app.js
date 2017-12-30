export default (sequelize, { SMALLINT, STRING, TEXT, DATE }) => {
  const App = sequelize.define("app", {
    name: {
      type: STRING,
      unique: true
    },
    percentage: SMALLINT,
    applogo: {
      type: STRING
    },
    description: TEXT,
    modaltype: {
      type: SMALLINT,
      defaultValue: 0
    },
    updatedate: DATE,
    versionnumber: STRING,
    teaserdescription: TEXT,
    ownpage: STRING,
    supportwebsite: STRING,
    supportphone: STRING
  });

  App.associate = models => {
    App.belongsTo(models.Developer, { foreignKey: "developerid" });
  };

  return App;
};
