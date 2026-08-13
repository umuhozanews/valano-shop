const cloudinary = require("cloudinary").v2;

// Configure Cloudinary from CLOUDINARY_URL or individual environment credentials
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL,
  });
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Uploads a memory buffer (from Multer memoryStorage) directly to Cloudinary.
 * @param {Buffer} buffer - File buffer from req.file.buffer
 * @param {String} folder - Cloudinary target folder
 * @returns {Promise<String>} Secure URL of uploaded image
 */
async function uploadToCloudinary(buffer, folder = "inzira_uploads") {
  if (!process.env.CLOUDINARY_URL && (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET)) {
    throw new Error("CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME, API_KEY, API_SECRET) environment variables are not configured.");
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) {
          console.error("[CLOUDINARY UPLOAD ERROR]", error.message);
          return reject(error);
        }
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

module.exports = {
  cloudinary,
  uploadToCloudinary,
};
