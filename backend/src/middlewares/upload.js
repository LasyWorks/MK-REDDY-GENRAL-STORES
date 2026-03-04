const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const ApiError = require('../utils/ApiError');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
// Ensure the uploads directory exists (survives fresh clones / missing folders)
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});
const excelFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];
  const allowedExts = ['.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only Excel files (.xlsx, .xls) are allowed'), false);
  }
};
const imageFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only image files (jpg, png, gif, webp) are allowed'), false);
  }
};
const uploadExcel = multer({
  storage,
  fileFilter: excelFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, 
  },
}).single('file');
const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, 
  },
}).single('image');
const uploadImages = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, 
  },
}).array('images', 5); 
const handleUpload = (uploadFn) => {
  return (req, res, next) => {
    uploadFn(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(ApiError.badRequest('File size too large'));
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(ApiError.badRequest('Unexpected file field'));
        }
        return next(ApiError.badRequest(err.message));
      }
      if (err) {
        return next(err);
      }
      next();
    });
  };
};
module.exports = {
  uploadExcel: handleUpload(uploadExcel),
  uploadImage: handleUpload(uploadImage),
  uploadImages: handleUpload(uploadImages),
};
