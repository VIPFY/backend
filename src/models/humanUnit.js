export default sequelize => {
  const HumanUnit = sequelize.define("humanunit_data", {});
  HumanUnit.associate = ({ Human, Unit }) => {
    HumanUnit.belongsTo(Human, { foreignKey: "humanid" });
    HumanUnit.belongsTo(Unit, { foreignKey: "unitid" });
  };

  HumanUnit.removeAttribute("id");

  return HumanUnit;
};
