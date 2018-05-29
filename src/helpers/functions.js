import Invoice from "nodeice";
import bcrypt from "bcrypt";
import { random } from "lodash";
import moment from "moment";

export const getDate = () => new Date().toUTCString();

export const createPassword = async email => {
  // A password musst be created because otherwise the not null rule of the
  // database is violated
  const passwordHash = await bcrypt.hash(email, 5);

  // Change the given hash to improve security
  const start = random(3, 8);
  const newHash = await passwordHash.replace("/", 2).substr(start);

  return newHash;
};

export const parentAdminCheck = async (models, user) => {
  await models.sequelize
    .query(
      "Select DISTINCT (id) from department_employee_view where id not in (Select childid from department_employee_view where childid is Not null) and employee = ?",
      { replacements: [user.id], type: models.sequelize.QueryTypes.SELECT }
    )
    .then(roots => roots.map(root => user.set({ company: root.id })));

  const isAdmin = await models.Right.findOne({
    where: { holder: user.id, forunit: user.company, type: "admin" }
  });
  await user.set({ admin: !!isAdmin });

  return user;
};

export const formatFilename = filename => {
  const date = moment().format("DDMMYYYY");
  const randomString = Math.random()
    .toString(36)
    .substring(2, 7);
  const cleanFilename = filename.toLowerCase().replace(/[^a-z0-9]/g, "-");

  return `${date}-${randomString}-${cleanFilename}`;
};

export const createBill = ({ contact, address, company, id, single }) => {
  const { country, address: { zip, city, street } } = address;
  const { email, phone } = contact;
  const date = moment().format("YYYY-MM-DD");
  const dueDate = moment()
    .add(2, "weeks")
    .format("YYYY-MM-DD");
  const year = moment().format("YYYY");
  const number = `V${single ? "S" : "M"}-${year}-${id}-01`;
  const billName = formatFilename("vipfy-bill");

  const vipfyInvoice = new Invoice({
    config: {
      template: `${__dirname}/../templates/invoice.html`,
      tableRowBlock: `${__dirname}/../templates/row.html`
    },
    data: {
      currencyBalance: {
        main: 1,
        secondary: 3.67
      },
      invoice: {
        number,
        date,
        dueDate,
        explanation: "Thank you for your business, dear Vipfy Customer!",
        currency: {
          main: "USD",
          secondary: "EUR"
        }
      },
      tasks: [
        {
          description: "Some interesting test",
          unit: "Hours",
          quantity: 5,
          unitPrice: 2
        },
        {
          description: "Another interesting test",
          unit: "Hours",
          quantity: 10,
          unitPrice: 3
        },
        {
          description: "The most interesting one",
          unit: "Hours",
          quantity: 3,
          unitPrice: 5
        }
      ]
    },
    seller: {
      company: "Vipfy GmbH",
      registrationNumber: "F05/XX/YYYY",
      taxId: "00000000",
      address: {
        street: "The Street Name",
        number: "00",
        zip: "000000",
        city: "Vipfytown",
        region: "Some Region",
        country: "Kingdom of Vipfy"
      },
      phone: "001 234590934234",
      email: "billing@vipfy.com",
      website: "vipfy.com",
      bank: {
        name: "Cayman Island Bank",
        swift: "XXXXXX",
        currency: "XXX",
        iban: "..."
      }
    },
    buyer: {
      company,
      taxId: "00000000",
      address: { street, zip, city, country },
      phone,
      email
    }
  });

  // Render invoice as HTML and PDF
  vipfyInvoice
    .toHtml(`${__dirname}/../files/${billName}.html`, err => {
      console.log("Error: ", err);
      console.log("Saved HTML file");
    })
    .toPdf(
      {
        output: `${__dirname}/../files/${billName}.pdf`,
        converter: {
          fitToPage: true
        }
      },
      err => {
        console.log("Error: ", err);
        console.log("Saved pdf file");
      }
    );

  // Serve the pdf via streams (no files)
  // require("http")
  //   .createServer((req, res) => {
  //     myInvoice.toPdf({ output: res });
  //   })
  //   .listen(8000);
};
