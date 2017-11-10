export default (sequelize, DataTypes) => {
  const Developer = sequelize.define(
    "developer",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        unique: true
      },
      name: {
        type: DataTypes.STRING
      },
      website: {
        type: DataTypes.STRING
      },
      legalwebsite: {
        type: DataTypes.STRING
      },
      bankaccount: {
        type: DataTypes.STRING
      }
    },
    {
      timestamps: false
    }
  );

  return Developer;
};
