import moment from "moment";
import Invoice from "./invoiceGenerator";
import { formatFilename } from "./functions";
import { uploadInvoice } from "../services/gcloud";

export default async (monthly, models, unitid, billId, billItems) => {
  try {
    const tag = "billing";
    let single = true;
    if (monthly) {
      single = false;
    }

    const p1 = models.Address.findOne({
      attributes: ["country", "address"],
      where: { unitid, tag }
    });
    const p2 = models.Email.findOne({ attributes: ["email"], where: { unitid, tag } });
    const p3 = models.Phone.findOne({ attributes: ["number"], where: { unitid, tag } });
    const p4 = models.Department.findOne({ attributes: ["name"], where: { unitid } });
    let [address, email, phone, company] = await Promise.all([p1, p2, p3, p4]);

    address = address.get();
    email = email.get().email;
    phone = phone.get().number;
    company = company.get().name;

    const { country, address: { zip, city, street } } = address;
    const date = moment().format("YYYY-MM-DD");
    const dueDate = moment()
      .add(2, "weeks")
      .format("YYYY-MM-DD");
    const year = moment().format("YYYY");
    const number = `V${single ? "S" : "M"}-${year}-${billId}-01`;
    const billName = formatFilename(billId);

    const vipfyInvoice = new Invoice({
      config: {
        template: `${__dirname}/../templates/invoice.html`,
        tableRowBlock: `${__dirname}/../templates/row.html`
      },
      data: {
        currencyBalance: {
          main: 1
        },
        invoice: {
          number,
          date,
          dueDate,
          explanation: "Thank you for your business, dear Vipfy Customer!",
          currency: "USD"
        },
        billItems
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

    // Render invoice as PDF
    const path = `${__dirname}/../files/${billName}.pdf`;
    await vipfyInvoice.toPdf(path, async err => {
      if (err) {
        return new Error(err);
      }

      const ok = await uploadInvoice(path, billName, year);
      if (ok !== true) {
        return ok;
      }

      return console.log("Saved pdf file");
    });

    return { ok: true, billName };

    // Serve the pdf via streams (no files)
    // require("http")
    //   .createServer((req, res) => {
    //     myInvoice.toPdf({ output: res });
    //   })
    //   .listen(8000);
  } catch (err) {
    return { ok: false, err };
  }
};
