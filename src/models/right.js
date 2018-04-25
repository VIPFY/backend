export default (sequelize, { STRING }) => {
  const Right = sequelize.define("right_data", {
    type: { type: STRING, allowNull: false }
  });

  Right.associate = ({ Unit }) => {
    Right.belongsTo(Unit, { foreignKey: "holder" });
    Right.belongsTo(Unit, { foreignKey: "forunit" });
  };

  Right.removeAttribute("id");

  return Right;
};
