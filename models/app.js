export default (sequelize, DataTypes) => {
  const App = sequelize.define(
    "app",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        unique: true
      },
      name: {
        type: DataTypes.STRING,
        unique: true
      },
      applogo: {
        type: DataTypes.STRING
      },
      description: {
        type: DataTypes.STRING
      },
      developerid: {
        type: DataTypes.INTEGER
      }
    },
    { timestamps: false }
  );

  return App;
};
