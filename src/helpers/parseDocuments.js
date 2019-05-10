import models from "@vipfy-private/sequelize-setup";
import Fs from "fs";
import parseXlsx from "excel";

const parseCSV = async pathExcel => {
  const allSSOs = await parseXlsx(pathExcel);
  allSSOs.pop();

  // Read the data till after password field
  const filteredSSOs = allSSOs
    .map(row => ({
      app: row[0],
      loginLink: row[1],
      username: row[4],
      password: row[5]
    }))
    .filter(row => row.password != "" && row.password != "-");

  const apps = await models.sequelize.query(
    `
    SELECT DISTINCT ad.id, LOWER(ad.name) as name
    FROM plan_data
      LEFT OUTER JOIN app_data ad on plan_data.appid = ad.id
    WHERE plan_data.options ->> 'external' = 'true';
`,
    { type: models.sequelize.QueryTypes.SELECT }
  );
  const ssos = [];
  const missed = [];

  filteredSSOs.forEach(sso => {
    if (apps.find(app => sso.app.toLowerCase().includes(app.name))) {
      ssos.push(sso.app);
    } else {
      missed.push(sso.app);
    }
  });

  Fs.unlink(`${__dirname}/missed_ssos.txt`, err => {
    if (err) {
      console.log(err);
    }
  });

  console.log("Start");
  const file = Fs.createWriteStream(`${__dirname}/missed_ssos.txt`);
  file.on("error", err => console.log(err));
  missed.forEach(sso => {
    file.write(`${sso}\n`);
  });
  file.end();
  console.log("End");
};

parseCSV(`${__dirname}/saas_list.xlsx`);
