import fs from "fs";
import readFile from "read-utf8";
import mustache from "mustache";
import sameTime from "same-time";
import oneByOne from "one-by-one";
import iterateObject from "iterate-object";
import noop from "noop6";
import ul from "ul";
import isStream from "is-stream";
import { path as phantomPath } from "phantomjs-prebuilt";
import htmlToPdf from "phantom-html-to-pdf";

const htmlPdf = htmlToPdf({ phantomPath });

/* eslint-disable no-underscore-dangle, consistent-return, no-param-reassign */

const _createClass = (function () {
  function defineProperties(target, props) {
    for (let i = 0; i < props.length; i++) {
      const descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }
  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}());

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

/**
 * Invoice
 * This is the constructor that creates a new instance containing the needed
 * methods.
 *
 * @name Invoice
 * @function
 * @param {Object} options The options for creating the new invoice:
 *
 *  - `config` (Object):
 *    - `template` (String): The HTML root template.
 *  - `data` (Object):
 *    - `currencyBalance` (Object):
 *      - `unitPrice` (Number): The main balance.
 *      - `secondary` (Number): The converted main balance.
 *      - `tasks` (Array): An array with the tasks (description of the services you did).
 *      - `invoice` (Object): Information about invoice.
 *  - `seller` (Object): Information about seller.
 *  - `buyer` (Object): Information about buyer.
 */
module.exports = (function () {
  function InvoiceGenerator(options) {
    _classCallCheck(this, InvoiceGenerator);

    this.options = options;
    this.templates = {};
  }

  /**
   * initTemplates
   * Inits the HTML templates.
   *
   * @name initTemplates
   * @function
   * @param {Function} callback The callback function.
   */

  _createClass(InvoiceGenerator, [
    {
      key: "initTemplates",
      value: function initTemplates(callback) {
        const _this = this;

        if (this.templates.root === undefined || this.templates.tableRowBlock === undefined) {
          sameTime(
            [
              function (cb) {
                return readFile(_this.options.config.template, cb);
              },
              function (cb) {
                return readFile(_this.options.config.tableRowBlock, cb);
              }
            ],
            (err, data) => {
              if (err) {
                return callback(err);
              }
              _this.templates.root = data[0];
              _this.templates.tableRowBlock = data[1];
              callback(null, _this.templates);
            }
          );
        } else {
          return callback(null, this.templates);
        }
      }

      /**
       * toHtml
       * Renders the invoice in HTML format.
       *
       * @name toHtml
       * @function
       * @param {String} output An optional path to the output file.
       * @param {Function} callback The callback function.
       * @return {Invoice} The `Nodeice` instance.
       */
    },
    {
      key: "toHtml",
      value: function toHtml(output, callback) {
        if (typeof output === "function") {
          callback = output;
          output = null;
        }

        const options = this.options;
        const tasks = options.data.billItems;
        let invoiceHtml = "";
        const invoiceData = {
          seller: options.seller,
          buyer: options.buyer,
          invoice: options.data.invoice,
          description_rows: "",
          total: 0
        };

        this.initTemplates((err, templates) => {
          if (err) {
            return callback(err);
          }

          iterateObject(tasks, (cTask, i) => {
            // Set the additional fields and compute data
            cTask.nrCrt = i + 1;

            // Sum the amount to the total
            invoiceData.total += parseFloat(cTask.unitPrice);

            // Render HTML for the current row
            invoiceData.description_rows += mustache.render(templates.tableRowBlock, cTask);
          });

          // Render the invoice HTML fields
          invoiceHtml = mustache.render(templates.root, invoiceData);

          // Output file
          if (typeof output === "string") {
            fs.writeFile(output, invoiceHtml, error => {
              callback(error, invoiceHtml);
            });
            return;
          }

          // Callback the data
          callback(null, invoiceHtml);
        });

        return this;
      }
    },
    {
      /**
       * toPdf
       * Renders invoice as pdf
       *
       * @name toPdf
       * @function
       * @param {Object|String|Stream} options The path the output pdf file, the
       * stream object, or an object containing:
       *
       *  - `output` (String|Stream): The path to the output file or the stream object.
       *  - `converter` (Object): An object containing custom settings for the [`phantom-html-to-pdf`](https://github.com/pofider/phantom-html-to-pdf).
       *
       * @param {Function} callback The callback function
       * @return {Invoice} The Invoice instance
       */
      key: "toPdf",
      value: async function toPdf(ops, callback) {
        const opsIsStream = isStream(ops);
        let noStream = false;

        callback = callback || noop;
        if (typeof ops === "function") {
          callback = ops;
          ops = {};
        }

        if (typeof ops === "string" || opsIsStream) {
          ops = { output: ops };
        }

        if (!opsIsStream && typeof ops.output === "string") {
          ops.output = fs.createWriteStream(ops.output);
        }

        noStream = !isStream(ops.output);

        ops = ul.deepMerge(ops, {
          converter: {
            viewportSize: {
              width: 2480,
              height: 3508
            },
            paperSize: {
              format: "A4"
            },
            fitToPage: true
          }
        });

        oneByOne(
          [
            this.toHtml.bind(this),
            function (next, html) {
              ops.converter.html = html;
              htmlPdf(ops.converter, next);
            },
            function (next, pdf) {
              if (noStream) {
                return next(null, pdf);
              }

              const err = [];
              ops.output.on("error", err2 => err2.push(err));
              pdf.stream.on("end", () => {
                if (err.length) {
                  return next(err.length === 1 ? err[0] : err);
                }
                next(null, pdf);
              });
              pdf.stream.pipe(ops.output);
            }
          ],
          (err, data) => {
            callback(err, data[1], data[0]);
          }
        );
      }
    }
  ]);

  return InvoiceGenerator;
}());
