import AWS from "aws-sdk";
import fs from "fs";
import moment from "moment";
import { formatFilename } from "../helpers/functions";

export const s3 = new AWS.S3({ region: "eu-central-1" });

const createWrapper = wrapper => {
  const baseResolver = wrapper;
  baseResolver.createWrapper = childWrapper => {
    const newWrapper = async (file, folder, optional) => {
      await wrapper(file, folder, optional);
      return childWrapper(file, folder, optional);
    };
    return createWrapper(newWrapper);
  };
  return baseResolver;
};

const fileTypeCheck = createWrapper(file => {
  try {
    const validFileExtensions = [
      "image/jpg",
      "image/jpeg",
      "image/tiff",
      "image/gif",
      "image/png",
      "image/webp",
    ];
    const validFile = validFileExtensions.find(ext => ext == file.mimetype);

    if (!validFile) {
      throw new Error("Not a supported file type");
    }

    return true;
  } catch (err) {
    throw new Error(err);
  }
});

export const uploadInvoice = async (path, name) => {
  const year = moment().format("YYYY");
  const Key = `${year}/${name}.pdf`;
  const Bucket = process.env.AWS_BUCKET
    ? "invoices.dev.vipfy.store"
    : "invoices.vipfy.store";

  try {
    const Body = fs.createReadStream(path);

    const params = {
      Key,
      Body,
      Bucket,
      ContentType: "application/pdf",
    };

    await s3.upload(params).promise();
    fs.unlinkSync(path);

    return true;
  } catch (err) {
    throw new Error(err);
  }
};

export const uploadUserImage = fileTypeCheck.createWrapper(
  async ({ stream, filename }, folder) => {
    const ourFilename = formatFilename(filename);
    const Key = `${folder}/${ourFilename}`;
    const Bucket = "userimages.vipfy.store";

    try {
      const Body = stream;

      const params = {
        Key,
        Body,
        Bucket,
      };

      await s3.upload(params).promise();

      return Key;
    } catch (err) {
      throw new Error(err);
    }
  }
);

export const uploadTeamImage = fileTypeCheck.createWrapper(
  async ({ createReadStream, filename }, folder) => {
    const ourFilename = formatFilename(filename);
    const Key = `${folder}/${ourFilename}`;
    const Bucket = "userimages.vipfy.store";

    try {
      await s3.upload({ Key, Body: createReadStream(), Bucket }).promise();

      return Key;
    } catch (err) {
      throw new Error(err);
    }
  }
);

export const uploadAppImage = fileTypeCheck.createWrapper(
  async ({ createReadStream, filename }, folder, fileName) => {
    const ourFilename = fileName || formatFilename(filename);
    const Key = `${folder}/${ourFilename}`;
    const Bucket = "appimages.vipfy.store";

    try {
      await s3.upload({ Key, Body: createReadStream(), Bucket }).promise();

      return Key;
    } catch (err) {
      throw new Error(err);
    }
  }
);

export const deleteUserImage = async file => {
  const params = { Key: file, Bucket: "userimages.vipfy.store" };
  return s3.deleteObject(params).promise();
};

export const deleteAppImage = async file => {
  const params = { Key: file, Bucket: "appimages.vipfy.store" };
  return s3.deleteObject(params).promise();
};

/**
 * Response Object of the s3.listObjectsV2 method
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#listObjectsV2-property
 *
 * @typedef {Object} listObjectsV2Res
 * @param {string} res.Key - The name that you assign to an object. You use the object key to retrieve the object.
 * @param {Date} res.LastModified - The date the Object was Last Modified
 * @param {string} res.ETag - The entity tag is a hash of the object. The ETag reflects changes only to the contents of an object, not its metadata. The ETag may or may not be an MD5 digest of the object data. Whether or not it is depends on how the object was created and how it is encrypted.
 * @param {number} res.Size - Size in bytes of the object
 * @param {string} res.StorageClass - The class of storage used to store the object.
 */

/**
 * Fetches recursively metadata about files in the study bucket
 *
 * @param {string} [startAfter] - The method only returns 1000 entries, so if this token is supplied, it starts the list after it. Will be automatically provided by the function.
 * @param {listObjectsV2Res[]} [res=[]] - The full list {@link listObjectsV2Res}
 * @returns {listObjectsV2Res[]}
 */
export async function fetchStudyData(startAfter, res = []) {
  const params = {
    Bucket: "vipfy-studien",
    Prefix: "security/",
  };

  if (startAfter) {
    params.StartAfter = startAfter;
    // Turns into an endless loop if not provided, even as it is
    // technically redundant. These morons at AWS...
    params.ContinuationToken = startAfter;
  }

  try {
    console.log("Fetching data... 🚚");
    const data = await s3.listObjectsV2(params).promise();

    if (data.IsTruncated && data.NextContinuationToken) {
      return await fetchStudyData(data.NextContinuationToken, [
        ...res,
        ...data.Contents,
      ]);
    }
    console.log("\x1b[1m%s\x1b[0m", "Fetching Done! 💪");
    return res;
  } catch (error) {
    throw new Error(error);
  }
}

/**
 * Generates a link where we can download the invoice.
 *
 * @export
 * @param {string} billname
 * @param {string} time
 * @returns {string}
 */
export const getInvoiceLink = async (billname, time) => {
  const year = moment(time).format("YYYY");
  const Key = `${year}/${billname}.pdf`;
  const Bucket = process.env.AWS_BUCKET
    ? "invoices.dev.vipfy.store"
    : "invoices.vipfy.store";

  try {
    const url = await s3.getSignedUrl("getObject", {
      Bucket,
      Key,
      Expires: 3600,
    });

    return url;
  } catch (err) {
    throw new Error(err);
  }
};
