const multer = require('multer')
const path = require('path')
const fs = require('fs')

const createUploader = (folder) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = `public/uploads/${folder}`
      fs.mkdirSync(dir, { recursive: true })
      cb(null, dir)
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname)
      cb(null, `${folder.slice(0, -1)}-${Date.now()}${ext}`)
    }
  })

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) cb(null, true)
      else cb(new Error('Solo se permiten imágenes'))
    }
  })
}

module.exports = { createUploader }