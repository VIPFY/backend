export default sequelize => {
  const ParentUnit = sequelize.define("parentunit_data");

  ParentUnit.associate = ({ Unit }) => {
    ParentUnit.belongsTo(Unit, { foreignKey: "parentunit" });
    ParentUnit.belongsTo(Unit, { foreignKey: "childunit" });
  };

  return ParentUnit;
};
