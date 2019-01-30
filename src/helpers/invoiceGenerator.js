import Fs from "fs";
import Path from "path";
import Util from "util";
import Handlebars from "handlebars";
import Puppeteer from "puppeteer";

const ReadFile = Util.promisify(Fs.readFile);

Handlebars.registerHelper("createRows", items => {
  let out = "";

  items.forEach((item, key) => {
    out += `
    <tr>
      <td class="text-center">${key + 1}</td>
      <td class="text-center">${item.description}</td>
      <td class="text-center">${item.quantity} Licences</td>
      <td class="text-right">${item.unitPrice}</td>
    </tr>`;
  });

  return out;
});

export default async config => {
  try {
    const templatePath = Path.resolve(config.path);
    const content = await ReadFile(templatePath, "utf8");

    // compile and render the template with handlebars
    const template = Handlebars.compile(content);

    const html = await template(config.data);
    const browser = await Puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html);
    Fs.writeFile(config.pathHTML, html, err => {
      if (err) throw err;
      console.log("Page saved!");
    });
    await page.pdf({ path: config.pathPdf, format: "A4" });
  } catch (error) {
    throw new Error("Cannot create invoice HTML template.");
  }
};
