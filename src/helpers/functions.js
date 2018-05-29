import Invoice from "nodeice";
import bcrypt from "bcrypt";
import { random } from "lodash";
import moment from "moment";

export const getDate = () => new Date().toUTCString();
const date = moment().format("DDMMYYYY");

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
  const randomString = Math.random()
    .toString(36)
    .substring(2, 7);
  const cleanFilename = filename.toLowerCase().replace(/[^a-z0-9]/g, "-");

  return `${date}-${randomString}-${cleanFilename}`;
};

export const createBill = bill => {
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
        number: {
          series: "PREFIX",
          separator: "-",
          id: 1
        },
        date,
        dueDate: bill,
        explanation: "Thank you for your business, dear Vipfy Customer!",
        currency: {
          main: "XXX",
          secondary: "ZZZ"
        }
      },
      tasks: [
        {
          description: "Some interesting task",
          unit: "Hours",
          quantity: 5,
          unitPrice: 2
        },
        {
          description: "Another interesting task",
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
        city: "Vipfyton",
        region: "Some Region",
        country: "Kingdom of Vipfy"
      },
      phone: "+40 726 xxx xxx",
      email: "me@example.com",
      website: "vipfy.com",
      bank: {
        name: "Some Bank Name",
        swift: "XXXXXX",
        currency: "XXX",
        iban: "..."
      }
    },
    buyer: {
      company: "Another Company GmbH",
      taxId: "00000000",
      address: {
        street: "The Street Name",
        number: "00",
        zip: "000000",
        city: "Some City",
        region: "Some Region",
        country: "Nowhere"
      },
      phone: "+40 726 xxx xxx",
      email: "me@example.com",
      website: "example.com",
      bank: {
        name: "Some Bank Name",
        swift: "XXXXXX",
        currency: "XXX",
        iban: "..."
      }
    }
  });

  const billName = formatFilename("vipfy-bill");

  // Render invoice as HTML and PDF
  vipfyInvoice
    .toHtml(`${__dirname}/../files/${billName}.html`, (err, data) => {
      console.log("Data: ", data);
      console.log("Error: ", err);
      console.log("Saved HTML file");
    })
    .toPdf(`${__dirname}/../files/${billName}.pdf`, (err, data) => {
      console.log("Data: ", data);
      console.log("Error: ", err);
      console.log("Saved pdf file");
    });

  // Serve the pdf via streams (no files)
  // require("http")
  //   .createServer((req, res) => {
  //     myInvoice.toPdf({ output: res });
  //   })
  //   .listen(8000);
};
