export default (sequelize, { TEXT, BOOLEAN, INTEGER }) => {
  const Email = sequelize.define("email_data", {
    email: { type: TEXT, allowNull: false },
    verified: { type: BOOLEAN, defaultValue: false },
    autogenerated: { type: BOOLEAN, defaultValue: false },
    description: TEXT,
    priority: INTEGER,
    tag: TEXT
  });

  Email.associate = ({ Unit }) => Email.belongsTo(Unit, { foreignKey: "unitid" });

  Email.removeAttribute("id");

  return Email;
};
