import Fs from "fs";
import Path from "path";
import Util from "util";
import Handlebars from "handlebars";
import Puppeteer from "puppeteer";

const ReadFile = Util.promisify(Fs.readFile);
/* eslint-disable indent */
Handlebars.registerHelper("createRows", (items, startPos) => {
  if (items.length == 0) {
    return "";
  }

  return items
    .map(item => {
      startPos++;
      return `
    <tr>
      <th rowspan="${item.description.length + 1}">Pos. ${startPos}</th>
      <th>${item.service}</th>
      <th>ID #${item.id}</th>
      <th rowspan="${item.description.length + 1}">${
        item.unitPrice ? item.unitPrice : `-${item.discount}`
      } ${item.currency}</th>
    </tr>
    ${item.description
      .map(
        desc => `
        <tr>
          <td>${desc.name}</td>
          <td>${desc.data} Licenses</td>
        </tr>
      `
      )
      .reduce((acc, cV) => acc.concat(cV))}
    <tr><td class="spacer"/></tr>
    `;
    })
    .reduce((acc, cV) => acc.concat(cV));
});

export default async config => {
  try {
    const headerPath = Path.resolve(`${__dirname}/../templates/header.html`);
    const footerPath = Path.resolve(`${__dirname}/../templates/footer.html`);

    const header = await ReadFile(headerPath, "utf8");
    const content = await ReadFile(config.path, "utf8");
    const footer = await ReadFile(footerPath, "utf8");

    // compile and render the template with handlebars
    await Handlebars.registerPartial("header", header);
    await Handlebars.registerPartial("footer", footer);
    const template = await Handlebars.compile(content);

    const html = await template(config.data);
    const browser = await Puppeteer.launch();
    const page = await browser.newPage();

    await Fs.writeFile(config.htmlPath, html, err => {
      if (err) throw err;
    });

    await page.goto(`file://${config.htmlPath}`, {
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

    Fs.unlinkSync(config.htmlPath);

    return true;
  } catch (error) {
    console.log(error);
    throw new Error("Cannot create invoice HTML template.");
  }
};
