import Fs from "fs";
import Path from "path";
import Util from "util";
import Handlebars from "handlebars";
import Puppeteer from "puppeteer";

const ReadFile = Util.promisify(Fs.readFile);

Handlebars.registerHelper("createRows", items => {
  let out = "";

  items.forEach((item, key) => {
    key++;
    out += `
    <tr class="${key % 5 == 0 ? "page" : ""}">
      <th rowspan="3">Pos. ${key}</th>
      <th>${item.app}</th>
      <th>ID #${item.id}</th>
      <th rowspan="3">${item.unitPrice} ${item.currency}</th>
    </tr>
    <tr>
      <td>Team Blue</td>
      <td>10 Licenses</td>
    </tr>
    <tr>
      <td>Team Yellow</td>
      <td>12 Licenses</td>
    </tr>
    <tr><td class="spacer"/></tr>
    `;
  });

  return out;
});

export default async config => {
  try {
    const headerPath = Path.resolve(`${__dirname}/../templates/header.html`);
    const templatePath = Path.resolve(config.path);
    const footerPath = Path.resolve(`${__dirname}/../templates/footer.html`);

    const header = await ReadFile(headerPath, "utf8");
    const content = await ReadFile(templatePath, "utf8");
    const footer = await ReadFile(footerPath, "utf8");

    // compile and render the template with handlebars
    await Handlebars.registerPartial("header", header);
    await Handlebars.registerPartial("footer", footer);
    const template = await Handlebars.compile(content);

    const html = await template(config.data);
    const browser = await Puppeteer.launch();
    const page = await browser.newPage();

    Fs.writeFile(config.pathHTML, html, err => {
      if (err) throw err;
      console.log("Page saved!");
    });

    await page.goto(`file://${config.pathHTML}`, {
      waitUntil: "domcontentloaded"
    });

    await page.pdf({
      path: config.pathPdf,
      format: "A4",
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "25mm"
      }
    });
  } catch (error) {
    console.log(error);
    throw new Error("Cannot create invoice HTML template.");
  }
};
