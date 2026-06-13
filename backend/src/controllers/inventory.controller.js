const {Product, Vendor, Category} = require('../models');
const uploadToCloudinary = require('../utils/uploadToCloudinary');


// Add new Product
const addProduct = async (req, res) => {
    try {
        // upload the images' buffers to cloudinary and store the image urls

        const uploadPromises = req.files.map(file => {
            return uploadToCloudinary(file.buffer);
        })
        
        const arrOfImgUrls = await Promise.all(uploadPromises);
    
        // store the image url and details of product into db
        const newProduct = await Product.create({
            vendorId: req.user.vendorId,
            categoryId: req.body.categoryId, 
            name: req.body.productName, 
            description: req.body.productDescription, 
            price: req.body.productPrice, 
            stock: req.body.productStock,
            image_urls: arrOfImgUrls 
        })

        res.status(201).json({
            success: true,
            product_detail: newProduct 
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({
            error: "Internal Server Error!"
        })
    }
} 

// View Inventory
const viewInventory = async (req, res) => {
    try {
        const inventory = await Product.findAll({
            where: {
                vendorId: req.user.vendorId
            }
        })
        res.status(200).json({
            success: true,
            inventory
        })
    } catch(err) {
        console.error(err)
        res.status(500).json({
            error: "Internal server error"
        })
    }
}

// Update a Product
const updateProduct = async (req, res) => {
    try {
        const { productId, name, description, price, stock } = req.body;

        if (!productId) {
            return res.status(400).json({ success: false, error: "Product ID is required" });
        }

        const product = await Product.findOne({
            where: {
                id: productId,
                vendorId: req.user.vendorId
            }
        });

        if (!product) {
            return res.status(404).json({ success: false, error: "Product not found or access denied" });
        }

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (price !== undefined && !isNaN(price)) updates.price = parseFloat(price);
        if (stock !== undefined && !isNaN(stock) && Number(stock) >= 0) updates.stock = parseInt(stock, 10);

        if (req.files) {

            // validate file type
            const allowedFiles = ['image/jpeg', 'image/png', 'image/webp']
            req.files.forEach(file => {
                if (!allowedFiles.includes(file.mimetype)) {
                    const error =  new Error("Invalid File format ");
                    error.type = "INVALID FILE FORMAT"
                    throw error
                }
            });

        // upload the images' buffers to cloudinary and store the image url

        const uploadPromises = req.files.map(file => {
            return uploadToCloudinary(file.buffer);
        })
        
        const arrOfImgUrls = await Promise.all(uploadPromises);

            updates.image_urls = arrOfImgUrls;
        }

        await product.update(updates);

        res.status(200).json({
            success: true,
            product
        });
    } catch(err) {
        console.log(err);
        if(err.type === "INVALID FILE FORMAT") {
            return res.status(400).json({error: err.message})
        }
        res.status(500).json({
            error: "Internal Server Error"
        });
    }
}


// Delete or Restore a Product 
const deleteOrRestoreProduct = async (req, res) => {
    try {
        const { productId, isActive, stock } = req.body;
        if (!productId) {
            return res.status(400).json({ success: false, error: "Product ID is required" });
        }

        const product = await Product.findOne({
            where: {
                id: productId,
                vendorId: req.user.vendorId
            }
        });

        if (!product) {
            return res.status(404).json({ success: false, error: "Product not found or access denied" });
        }

        if (isActive === false) {
            await product.update({ isActive: false });
        } else {
            if (stock === undefined || isNaN(stock) || Number(stock) < 0) {
                return res.status(400).json({ success: false, error: "Valid stock quantity is required to restore" });
            }
            await product.update({
                isActive: true,
                stock: parseInt(stock, 10)
            });
        }

        res.status(200).json({
            success: true,
            product
        });
    } catch(err) {
        console.log(err);
        res.status(500).json({
            error: "Internal Server Error"
        });
    }
}

module.exports = {addProduct, viewInventory, updateProduct, deleteOrRestoreProduct}


