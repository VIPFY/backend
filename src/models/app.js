export default (sequelize, { BOOLEAN, STRING, TEXT, JSONB, ARRAY }) => {
  const App = sequelize.define("app_data", {
    name: {
      type: STRING,
      unique: true,
      allowNull: false
    },
    commission: JSONB,
    logo: TEXT,
    description: TEXT,
    teaserdescription: TEXT,
    website: TEXT,
    images: ARRAY(TEXT),
    features: JSONB,
    options: JSONB,
    disabled: {
      type: BOOLEAN,
      defaultValue: true
    }
  });

  App.associate = ({ Unit }) => {
    App.belongsTo(Unit, { foreignKey: "developer" });
    App.belongsTo(Unit, { foreignKey: "supportunit" });
  };

  return App;
};
